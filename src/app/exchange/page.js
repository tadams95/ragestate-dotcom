import Header from "../components/Header";



function TicketExchange() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 ">
      <div className="ticket-exchange p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Ticket Exchange</h2>
        <div className="ticket-list mb-6">
          {/* Placeholder for ticket listing */}
          <p className="text-gray-400">No tickets available</p>
        </div>
        <div className="exchange-form">
          {/* Placeholder for exchange form */}
          <p className="text-gray-400">Exchange form goes here</p>
        </div>
      </div>
    </div>
  );
}

export default function Exchange() {
  return (
    <div className="bg-black isolate">
      <Header />
      <TicketExchange />
    </div>
  );
}
