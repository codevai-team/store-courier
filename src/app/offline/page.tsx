'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Нет подключения к интернету
        </h1>
        <p className="text-gray-600 mb-8">
          Проверьте подключение к интернету и попробуйте снова
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}
