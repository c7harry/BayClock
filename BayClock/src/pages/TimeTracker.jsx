export default function TimeTracker() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Time Tracker</h1>
      <div className="space-y-4">
        <input className="w-full p-2 border rounded" placeholder="Task Description" />
        <select className="w-full p-2 border rounded">
          <option>Select Project</option>
        </select>
        <div className="flex space-x-4">
          <input type="time" className="p-2 border rounded" />
          <input type="time" className="p-2 border rounded" />
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Start</button>
      </div>
    </div>
  );
}
