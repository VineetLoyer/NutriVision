import Image from 'next/image'

export default function Header() {
  return (
    <header className="bg-green-600 p-4 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Image src="/logo.svg" alt="Nutrivision Logo" width={40} height={40} />
          <h1 className="text-white text-2xl font-bold">Nutrivision</h1>
        </div>
      </div>
    </header>
  )
}

