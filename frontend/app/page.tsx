import { FlipWords } from "@/components/ui/flip-words";
import Link from "next/link";

export default function Home() {
  const words = ["AI-Powered", "Intelligent", "Customer-Support"];
  return (
    <div className="min-h-screen bg-gray-900 font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <header className="">
          <section className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-3xl lg:text-5xl font-bold text-gray-100 mb-10">
              <FlipWords className="mr-0" words={words} />
              Agent{" "}
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-gray-400 font-inter">
              Dive deep into our Customer Service Automation System
            </p>
            <div className="flex items-center gap-5 flex-wrap justify-center relative z-40">
              <Link href="/chat" className="">
                <button className="rounded-2xl font-bold py-4 px-8 items-center bg-blue-600 hover:bg-blue-700 text-white font-inter text-lg transition-all duration-200 border border-gray-700">
                  Get started
                </button>
              </Link>
            </div>
          </section>
        </header>
      </main>
    </div>
  );
}
