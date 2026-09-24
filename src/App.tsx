function App() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <h1 className="sr-only">Cell Defender</h1>
      <iframe
        src="/game/index.html"
        title="Cell Defender - jogo de defesa celular"
        className="h-full w-full border-0"
        allow="autoplay; fullscreen"
      />
    </main>
  );
}

export default App;
