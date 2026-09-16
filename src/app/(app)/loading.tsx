// Shown the instant a nav link is clicked, while the server renders the real page.
//
// Every page in here is dynamic — it has to be, the numbers are live — so each
// click costs a round trip. Without this the browser simply sat there for a few
// hundred milliseconds with nothing happening, which reads as "the app is slow"
// far more than the actual wait does. A skeleton that matches the real layout
// makes the click feel answered immediately.
//
// One file covers every route under (app); a route can override it with its own.
function Bar({ w, h = 13 }: { w: string; h?: number }) {
  return <span className="sk" style={{ width: w, height: h }} />;
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="page-head">
        <div>
          <Bar w="190px" h={26} />
          <div style={{ marginTop: 10 }}><Bar w="260px" /></div>
        </div>
      </div>

      <div className="metrics">
        {[0, 1, 2, 3].map((i) => (
          <div className="metric" key={i}>
            <Bar w="70%" h={11} />
            <div style={{ marginTop: 10 }}><Bar w="55%" h={22} /></div>
            <div style={{ marginTop: 8 }}><Bar w="80%" h={10} /></div>
          </div>
        ))}
      </div>

      <div className="card">
        <Bar w="150px" h={15} />
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 13 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="between" style={{ gap: 12 }}>
              <Bar w={`${34 - i * 2}%`} />
              <Bar w="14%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
