function strToDom(str) {
    return document.createRange().createContextualFragment(str).firstChild;
}
// Gère l'accélération de l'effet éventail
function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

class Point {
    constructor (x, y) {
        this.x = x
        this.y = y
    }
    toSvgPath () {
        return `${this.x} ${this.y}`
    }
    //Calcule un nouveau point en fonction d'un angle donné
    static fromAngle (angle) {
        return new Point(Math.cos(angle), Math.sin(angle))
    }
}

/** 
 * @property {number[]} data 
 * @property {SVGPathElement[]} paths
**/
class PieChart extends HTMLElement {
    constructor() {
        super()
        const shadow = this.attachShadow({mode: 'open'})
        const labels = this.getAttribute('labels')?.split(';') ?? []
        const donut = this.getAttribute('donut') ?? '0.005'
        const colors = this.getAttribute('colors')?.split(';') ?? ['#FAAA32', '#3EFA7D', '#FA6A25', '#0C94FA', '#FA1F19','#0CFAE2', '#AB6D23']
        this.data = this.getAttribute('data').split(';').map(v => parseFloat(v))
        const svg = strToDom(`<svg viewBox="-1 -1 2 2">
            <g mask="url(#graphMask)">
            
            </g>
            <mask id="graphMask">
                <rect fill="white" x="-1" y="-1" width="2" height="2" />    
                <circle r="${donut}" fill="black"/>
            </mask>
        </svg>`)
        const pathGroup = svg.querySelector('g')
        const maskGroup = svg.querySelector('mask')
        const gap = this.getAttribute('gap') ?? '0.015'

        // On crée les chemins
        this.paths = this.data.map((_, k) => {
            const color = colors[k % (colors.length -1)]
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            path.setAttribute('fill', color)
            pathGroup.appendChild(path)
            path.addEventListener('mouseover', () => this.handlePathHover(k))
            path.addEventListener('mouseout', () => this.handlePathOut(k))
            return path
        })

        // On crée les lignes de séparation des segments
        this.lines = this.data.map(() => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
            line.setAttribute('stroke', '#000')
            line.setAttribute('stroke-width', gap)
            line.setAttribute('x1', '0')
            line.setAttribute('y1', '0')
            maskGroup.appendChild(line)
            return line
        })

        // On crée les labels des segments
        this.labels = labels.map((label) => {
            const div = document.createElement('div')
            div.innerText = label
            shadow.appendChild(div)
            return div
        })

        // Style spécifique au shadow
        const style = document.createElement('style');
        style.innerHTML = `
            :host {
                display : block;
                position relative;
            }
            svg {
                width: 100%
                height: 100%
            }
            path {
                cursor: pointer;
                transition : opacity .3s;
            }
            path:hover {
                opacity: 0.5;
            }
            div {
                position: absolute;
                top: 0;
                left: 0;
                font-size: 0.8rem;
                padding: .1em .2em;
                transform : translate(-50%, -50%);
                background-color: var(--tooltip-bg, #FFF);
                opacity: 0;
                transition: opacity .3s;
            }
            .is-active {
                opacity: 1
            }
        `
        shadow.appendChild(style)
        shadow.appendChild(svg)
    }

    // Gère l'effet d'animation éventail
    connectedCallback () {
        const now = Date.now()
        const duration = 1000
        const draw = () => {
            const t = (Date.now() - now) / duration
            if (t < 1) {
                this.draw(easeOutExpo(t))
                window.requestAnimationFrame(draw)
            } else {
                this.draw(1)
            }
        }
        window.requestAnimationFrame(draw)
    }

    //Gère le dessin du SVG
    draw (progress = 1) {
        const total = this.data.reduce((acc, v) => acc + v, 0)
        let angle = Math.PI / -2
        let start = new Point(0, -1)
        for (let k = 0; k < this.data.length; k++) {
            this.lines[k].setAttribute('x2', start.x)
            this.lines[k].setAttribute('y2', start.y)
            const ratio = (this.data[k] / total) * progress
            if (progress == 1) {
                this.positionLabel(this.labels[k], angle + ratio * Math.PI)
            }
            angle += ratio * 2 * Math.PI
            const end = Point.fromAngle(angle)
            const largeFlag = ratio > .5 ? '1' : '0'
            this.paths[k].setAttribute('d', `M 0 0 L ${start.toSvgPath()} A 1 1 0 ${largeFlag} 1 ${end.toSvgPath()} L 0 0`)
            start = end
        }
    }

/**
 * Gère l'effet lorsque l'on survole une section du graphique
 * @param {number} k Index de l'élément survolé
**/  
    handlePathHover (k) {
        this.dispatchEvent(new CustomEvent('sectionhover', {detail: k}))
        this.labels[k]?.classList.add('is-active')
    }

/**
 * Gère l'effet lorsque l'on quitte la section du graphique
 * @param {number} k Index de l'élément survolé
**/    
    handlePathOut (k) {
        this.labels[k]?.classList.remove('is-active')
    }

/**
 * Positionne le label en fonction de l'angle
 * @param {HTMLDivElement|undefined} label 
 * @param {number} angle
**/
    positionLabel (label, angle) {
        if (!label || !angle) {
            return;
        }
        const point = Point.fromAngle(angle)
        //régler les proportions (par ex *0.3 et +0.41) en fonction de l'affichage
        label.style.setProperty('top', `${(point.y * 0.3 + 0.41) * 100}%`)
        label.style.setProperty('left', `${(point.x * 0.3 + 0.46) * 100}%`)
    }
}

customElements.define('pie-chart', PieChart)