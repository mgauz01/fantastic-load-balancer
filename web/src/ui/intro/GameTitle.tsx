interface GameTitleProps {
  animate?: boolean;
}

export default function GameTitle({ animate = true }: GameTitleProps) {
  return (
    <header
      className={`game-title-block${animate ? " game-title-block--animated" : ""}`}
    >
      <h1 className="game-title">FANTASTIC LOAD BALANCER</h1>
      <p className="game-subtitle">Layer 7 Load Balancer Trainer</p>
    </header>
  );
}
