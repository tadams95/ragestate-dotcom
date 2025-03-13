export default function EventStyling1() {
  return (
    <div
      className="fixed inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      aria-hidden="true"
    >
      <div
        className="relative left-1/2 -translate-x-1/2 aspect-[1155/700] w-full bg-gradient-to-tr from-[#8A041A] to-[#FFFFFF] opacity-75"
        style={{
          clipPath: "polygon(0 50%, 100% 50%, 100% 60%, 0 60%)",
        }}
      />
    </div>
  );
}
