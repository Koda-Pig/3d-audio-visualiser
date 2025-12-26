export class Bar {
  constructor(x, y, width, height, color, index) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.index = index;
  }
  update(micInput) {
    const sound = micInput * 1500;
    if (sound > this.height) {
      this.height = sound;
    } else this.height -= this.height * 0.01;
  }
  draw(context, windowHeight) {
    if (this.index % 3 !== 0) return;

    context.strokeStyle = this.color;
    context.lineWidth = this.width;
    context.save();
    context.rotate(this.index * -0.005);
    context.beginPath();
    context.bezierCurveTo(
      this.x / 2,
      this.y / 2,
      this.height * -0.5 - 0.2569373072970195 * windowHeight,
      this.height + 450,
      this.x,
      this.y
    );
    context.stroke();
    if (this.index > 100) {
      context.beginPath();
      context.arc(
        this.x,
        this.y + 10 + this.height / 2,
        this.height * 0.1,
        0,
        Math.PI * 2
      );
      context.stroke();
      context.beginPath();
      context.moveTo(this.x, this.y + 20);
      context.lineTo(this.x, this.y + 10 + this.height / 2);
      context.stroke();
    }
    context.restore();
  }
}
