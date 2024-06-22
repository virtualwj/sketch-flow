import {SVGDrawer, CanvasDrawer, sortArrayDescending, sortArrayAscending} from "@plot/render";
import {Node} from "./nodes";
import {Edge} from "./edges/Edge";
import {EventEmitter} from "./EventEmitter";
import {Anchor} from "./nodes/anchors/Anchor";
import {Plugin} from "./Plugin";
import {DragElement, Painter, AddText, LineShape, DragStage} from "./plugins";
import Animate from "./animate/tween/Animate";

// 声明 Stage 类
export interface GraphOptions {
  engine: "svg" | "canvas",
  toolbar: HTMLDivElement,
  plugin?: Array<typeof Plugin>
}

export type StageMode = "drag" | "painter" | "pencil" | "text"

export interface StageEvent {
  mousedown: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  mouseup: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  mousemove: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  mouseleave: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  mouseout: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  contextmenu: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  dblclick: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  wheel: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  click: { e: MouseEvent, x: number, y: number, realX: number, realY: number },
  animationEnd: { stage: Stage },
  modeChange: { mode: StageMode },
}


/**
 * Stage 类
 */
export class Stage extends EventEmitter<StageEvent> {
  nodes: Array<Node>
  edges: Array<Edge>
  engine: CanvasDrawer | SVGDrawer
  toolbar: HTMLDivElement
  plugin: Array<Plugin>
  __mode: StageMode = 'drag'

  isAddingEdge = false
  isAddingStartAnchor?: Anchor | null
  isMovingNode = false
  movingNode?: Node | null

  // eventManager: EventManager

  //被选中的Node
  selectedNode!: null | Node

  animate!: Animate

  translate: {
    x: number,
    y: number
  } = {x: 0, y: 0}

  constructor(public element: HTMLCanvasElement | SVGSVGElement, public options: GraphOptions) {
    super()
    this.nodes = [];
    this.edges = [];
    this.options = Object.assign({
      engine: "canvas",
      plugin: []
    }, options)
    this.toolbar = options.toolbar;

    if (this.options.engine === 'svg') {
      this.engine = new SVGDrawer(element as SVGSVGElement);
    } else {
      this.engine = new CanvasDrawer(element as HTMLCanvasElement);
    }

    this.options.plugin = this.options.plugin?.concat([LineShape, DragElement, Painter, AddText, DragStage]);
    this.options.plugin = sortArrayDescending(this.options.plugin || [], "priority")

    this.plugin = this.options.plugin!.map(plugin => {
      return new plugin(this);
    })

    this.bindEvent()
    // this.eventManager = new EventManager(this);
    this.mode = this.__mode;
    this.animate = new Animate(this)
    //@ts-ignore
    console.log(window.stage = this)
  }

  /**
   * 添加一个节点
   */
  addNode(node: Node) {
    //添加的位置
    let addIndex = this.nodes.length
    for (let i = 0; i < this.nodes.length; i++) {
      const el = this.nodes[i]
      if (node.zIndex < el.zIndex) {
        addIndex = i || 0;
        break;
      }

      if (node.zIndex >= el.zIndex && i === this.nodes.length - 1) {
        addIndex = i + 1
        break
      }
    }
    console.log(this.nodes.length, addIndex)
    this.nodes.splice(addIndex, 0, node);
    console.log(this.nodes)
    this.draw();
    return this;
  }

  addEdge(edge: Edge) {
    this.edges.push(edge);
    this.draw();
    return this;
  }

  deleteNode() {
    if (this.selectedNode) {
      this.selectedNode.delete()
      this.draw()
      this.hideToolbar()
    }
    return this;
  }

  get mode() {
    return this.__mode
  }

  set mode(mode) {
    this.__mode = mode;
    this.plugin.forEach(plugin => {
      plugin.modeChanged(mode);
    })
    this.emit("modeChange", {mode})
  }

  defaultMode() {
    this.mode = "drag";
  }

  getElementSize() {
    let width = 0, height = 0;
    if (this.options.engine === 'svg') {
      this.element = this.element as SVGSVGElement
      width = this.element.width.baseVal.value;
      height = this.element.width.baseVal.value;
    } else {
      this.element = this.element as HTMLCanvasElement
      width = this.element.width;
      height = this.element.height;
    }
    return {
      width, height
    }
  }

  showToolbar(e: any) {
    const mousePos = this.getMousePos(e);
    this.toolbar.style.display = 'block';
    this.toolbar.style.left = `${mousePos.x + 10}px`;
    this.toolbar.style.top = `${mousePos.y + 10}px`;
  }

  hideToolbar() {
    this.toolbar.style.display = 'none';
  }


  draw() {
    if (this.engine instanceof CanvasDrawer) {
      this.engine.ctx.clearRect(0, 0, this.engine.canvas.width, this.engine.canvas.height);
      this.engine.ctx.save()
      this.engine.ctx.translate(this.translate.x, this.translate.y)

    } else {
      this.element.innerHTML = ""
    }

    this.nodes.forEach(node => node.draw())
    this.edges.forEach(edge => edge.draw())
    this.plugin.forEach(plugin => {
      plugin.draw();
    })

    if (this.engine instanceof CanvasDrawer) {
      this.engine.ctx.restore()
    }
    return this;
  }


  getMousePos(e: MouseEvent) {
    const rect = this.element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    let {width, height} = this.getElementSize();
    // - this.translate.x 为了处理画布移动后，将坐标修正为原始未移动坐标
    return {
      realX: (e.clientX - rect.left) / (rect.right - rect.left) * (width as number / dpr) ,
      realY: (e.clientY - rect.top) / (rect.bottom - rect.top) * (height as number / dpr) ,
      x: (e.clientX - rect.left) / (rect.right - rect.left) * (width as number / dpr) - this.translate.x,
      y: (e.clientY - rect.top) / (rect.bottom - rect.top) * (height as number / dpr)- this.translate.y,
    };
  }

  bindEvent() {
    ["mousedown", "mousemove", "mouseup", "mouseout", "mouseleave", "dblclick", "contextmenu", "wheel", "click"].forEach(name => {
      this.element.addEventListener(name, (event) => {
        const e = event as MouseEvent;
        const {x, y, realX, realY} = this.getMousePos(e)
        console.log(x, y, realX, realY, this.translate)
        //TODO
        // @ts-ignore
        this.emit(name, {
          e, x, y, realX, realY
        })
      });
    })
  }
}
