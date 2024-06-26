import {Stage, StageMode} from "../Stage";
import {Plugin} from "../Plugin";
import {Text} from "../nodes/Text";

export class AddText extends Plugin {
  public fontSize = "30px";
  public el: HTMLInputElement | undefined;
  public name = 'TextPainter'
  public activeMode: Array<StageMode> = ["text"]
  public layer = 12
  static priority = 0
  public x: number = 0
  public y: number = 0

  constructor(public stage: Stage) {
    super(stage);
    this.stage.on("click", ({e, x, y}) => {
      if (!this.active) {
        return
      }
      if (this.el) {
        this.addText(this.x, this.y)
        e.preventDefault()
        return;
      }

      this.el = this.createInput(e, x, y)
    })
  }

  addText(x: number, y: number) {
    if (this.el) {
      var {w, h} = this.stage.engine.getTextBounding(this.el.value, 30);

      this.stage.addNode(new Text({
        x: x,
        y: y,
        w: w,
        h: h,
        text: this.el.value
      }, this.stage))

      this.el.remove();
      this.el = undefined;
      this.stage.defaultMode()
      this.x = 0
      this.y = 0
    }
  }

  createInput(e: MouseEvent, x: number, y: number) {
    // 创建一个 input 元素
    const input = document.createElement('input');

    // 添加隐藏边框的样式类
    input.className = 'hidden-border-input';
    input.style.fontSize = '30px'
    input.style.fontFamily = 'Arial'
    input.style.position = "absolute"
    input.style.border = "none"
    // input.style.lineHeight = "36px"
    input.style.outline = "none"
    input.style.background = "transparent"
    // 设置 input 元素的位置
    input.style.left = `${e.clientX}px`;
    input.style.top = `${e.clientY}px`;

    this.x = x;
    this.y = y;

    input.addEventListener('keydown', event => {
      var {w, h} = this.stage.engine.getTextBounding(input.value, 30);

      console.log(x, y, w, h)

      if (event.key === 'Enter') {
        this.addText(x, y)
      }
    });

    // 将 input 元素添加到 body
    document.body.appendChild(input);
    // 聚焦到新创建的 input 元素
    input.focus();
    return input
  }
}
