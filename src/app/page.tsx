import { redirect } from 'next/navigation'

export default function Home() {
  // Перенаправляем сразу на дашборд курьера
  redirect('/courier/dashboard')
}
