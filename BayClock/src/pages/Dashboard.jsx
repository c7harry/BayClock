export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white shadow rounded">Hours Today</div>
        <div className="p-4 bg-white shadow rounded">Hours This Week</div>
      </div>
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Recent Entries</h2>
        <div className="p-4 bg-white shadow rounded">[•] Fix Login Bug — 1h 45m</div>
      </div>
    </div>
  );
}