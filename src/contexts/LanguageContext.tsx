'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Language = 'ru' | 'ky'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  ru: {
    // Общие
    'welcome': 'Добро пожаловать',
    'loading': 'Загрузка...',
    'error': 'Ошибка',
    'success': 'Успешно',
    'save': 'Сохранить',
    'cancel': 'Отмена',
    'nameUpdated': 'Имя успешно обновлено',
    'phoneUpdated': 'Телефон успешно обновлен',
    'nameUpdateError': 'Ошибка при обновлении имени',
    'phoneUpdateError': 'Ошибка при обновлении телефона',
    'close': 'Закрыть',
    'update': 'Обновить',
    'phone': 'Телефон',
    'address': 'Адрес',
    'name': 'Имя',
    'comment': 'Комментарий',
    'total': 'Итого',
    'status': 'Статус',
    
    // Авторизация
    'signIn': 'Вход в систему',
    'welcomeBack': 'Добро пожаловать! Мы вас ждали',
    'phoneNumber': 'Номер телефона',
    'password': 'Пароль',
    'forgotPassword': 'Забыли пароль?',
    'signInWith': 'Или войти через',
    'noAccount': 'Нет аккаунта?',
    'signUp': 'Зарегистрироваться',
    'signInButton': 'Войти',
    'signingIn': 'Вход...',
    
    // Dashboard
    'courierPanel': 'Панель курьера',
    'manageOrders': 'Управляйте своими заказами и отслеживайте доставки',
    'updated': 'Обновлено',
    'available': 'Доступно',
    'inWork': 'В работе',
    'delivered': 'Доставлено',
    'canceled': 'Отменено',
    'availableOrders': 'Доступные заказы',
    'myOrders': 'Мои заказы',
    'noAvailableOrders': 'Нет доступных заказов',
    'noActiveOrders': 'У вас нет активных заказов',
    'noCompletedOrders': 'Завершенных заказов пока нет',
    'noCanceledOrders': 'Отмененных заказов пока нет',
    'newOrdersHere': 'Новые заказы появятся здесь автоматически',
    'acceptFromAvailable': 'Примите заказ из списка доступных',
    'completedOrdersHere': 'Завершенные заказы будут отображаться здесь',
    'canceledOrdersHere': 'Отмененные заказы будут отображаться здесь',
    'updateOrders': 'Обновить заказы',
    'updating': 'Обновление...',
    
    // Статистика
    'statistics': 'Статистика',
    'statisticsShort': 'Стат.',
    'totalOrders': 'Всего заказов',
    'completedOrders': 'Завершенных',
    'totalRevenue': 'Общая выручка',
    'averageOrder': 'Средний чек',
    'canceledOrders': 'Отмененных',
    'totalItems': 'Товаров доставлено',
    'completionRate': 'Процент выполнения',
    'activityByDays': 'Активность по дням недели',
    'noStatistics': 'Статистика недоступна',
    'statisticsDescription': 'Статистика будет доступна после выполнения первых заказов',
    'courierStatistics': 'Статистика курьера',
    'ordersForPeriod': 'Заказы за выбранный период',
    'statisticsInProgress': 'В пути',
    'statisticsEarned': 'Заработано',
    'som': 'сом',
  
    'showAllCompleted': 'Показать все завершенные заказы',
    
    // Статусы заказов
    'created': 'Создан',
    'courierWait': 'Ожидает',
    'courierPicked': 'Принят',
    'enroute': 'В пути',
    'deliveredStatus': 'Доставлен',
    
    // Действия
    'acceptOrder': 'Принять заказ',
    'startDelivery': 'Начать доставку',
    'markDelivered': 'Доставлено',
    
    // Заказ
    'order': 'Заказ',
    'orderNumber': 'Заказ #',
    'customerInfo': 'Информация о клиенте',
    'customerName': 'Имя клиента',
    'deliveryAddress': 'Адрес доставки',
    'orderComment': 'Комментарий к заказу',
    'orderItems': 'Товары в заказе',
    'quantity': 'Количество',
    'totalAmount': 'Итого к оплате',
    'courier': 'Курьер',
    'courierName': 'Имя курьера',
    'actions': 'Действия',
    'hasComment': 'Есть комментарий',
    'items': 'товаров',
    'item': 'товар',
    'items2': 'товара',
    
    // Фильтры и сортировка
    'filters': 'Фильтры',
    'sorting': 'Сортировка',
    'period': 'Период',
    'orderPrice': 'Цена заказа (сом)',
    'itemsCount': 'Кол-во товаров (шт.)',
    'resetAll': 'Сбросить все',
    'allTime': 'Все время',
    'today': 'Сегодня',
    'yesterday': 'Вчера',
    'thisWeek': 'За неделю',
    'thisMonth': 'За месяц',
    'thisYear': 'За год',
    'sortNewest': 'Сначала новые',
    'sortOldest': 'Сначала старые',
    'sortPriceHigh': 'Цена: по убыванию',
    'sortPriceLow': 'Цена: по возрастанию',
    'sortItemsHigh': 'Товаров: больше',
    'sortItemsLow': 'Товаров: меньше',
    'activeFilters': 'Активные фильтры:',
    'from': 'От',
    'to': 'До',
    
    // Модальное окно заказов
    'products': 'Товары',
    'seller': 'Продавец',
    'product': 'товар',
    'products2': 'товара',
    'products5': 'товаров',
    'client': 'Клиент',
    'phoneLabel': 'Телефон',
    'addressLabel': 'Адрес',
    
    // Навигация
    'storeCourier': 'StoreCourier',
    'courierCabinet': 'Личный кабинет курьера',
    'activeStatus': 'Активен',
    'logout': 'Выйти',
    'notifications': 'Уведомления',
    
    // Настройки
    'theme': 'Тема',
    'lightTheme': 'Светлая',
    'darkTheme': 'Темная',
    'language': 'Язык',
    'russian': 'Русский',
    'kyrgyz': 'Кыргызча',
    
    // Профиль
    'completeProfile': 'Завершите профиль',
    'profilePrivacy': 'Не волнуйтесь, только вы можете видеть свои личные данные',
    'editProfile': 'Редактировать профиль',
    'changePhone': 'Изменить телефон',
    'changePassword': 'Изменить пароль',
    'currentPhone': 'Текущий телефон',
    'newPhone': 'Новый телефон',
    'enterPhone': 'Введите номер телефона',
    'currentPassword': 'Текущий пароль',
    'newPassword': 'Новый пароль',
    'confirmPassword': 'Подтвердите пароль',
    'enterCurrentPassword': 'Введите текущий пароль',
    'enterNewPassword': 'Введите новый пароль',
    'confirmNewPassword': 'Подтвердите новый пароль',
    'passwordMismatch': 'Пароли не совпадают',
    'cancelOrder': 'Отменить заказ',
    'confirmCancelOrder': 'Подтверждение отмены заказа',
    'confirmCancelText': 'Вы действительно хотите отменить заказ',
    'pleaseSpecifyReason': 'Пожалуйста, укажите причину отмены:',
    'cancelReasonPlaceholder': 'Укажите причину отмены заказа...',
    'confirmCancel': 'Подтвердить отмену',
    'cancelling': 'Отменяем...',
    'cancelCommentRequired': 'Комментарий обязателен для отмены заказа',
    'cancelComment': 'Комментарий отмены',
    'hasCancelComment': 'Есть комментарий отмены',
    'adminComment': 'Комментарий администратора',
    'hasAdminComment': 'Есть комментарий администратора',
    'customerComment': 'Комментарий клиента',
    'pcs': 'шт.',
    'yourProfile': 'Ваш профиль',
    'loadingData': 'Загрузка данных...',
    'notSpecified': 'Не указано',
    'enterNewName': 'Введите новое имя',
    'saving': 'Сохранение...',
    'connectionError': 'Ошибка подключения к серверу',
    'searchOrders': 'Поиск по заказам (ID, адрес, имя, телефон, товары...)',
    'lastUpdated': 'Обновлен',
    'date': 'Дата'
  },
  ky: {
    // Общие
    'welcome': 'Кош келиңиз',
    'loading': 'Жүктөлүүдө...',
    'error': 'Ката',
    'success': 'Ийгиликтүү',
    'save': 'Сактоо',
    'cancel': 'Артка',
    'nameUpdated': 'Ат ийгиликтүү жаңыланды',
    'phoneUpdated': 'Телефон ийгиликтүү жаңыланды',
    'nameUpdateError': 'Атты жаңылоодо ката',
    'phoneUpdateError': 'Телефонду жаңылоодо ката',
    'close': 'Жабуу',
    'update': 'Жаңыртуу',
    'phone': 'Телефон',
    'address': 'Дарек',
    'name': 'Аты',
    'comment': 'Комментарий',
    'total': 'Жалпы',
    'status': 'Статус',
    
    // Авторизация
    'signIn': 'Системага кирүү',
    'welcomeBack': 'Кош келиңиз! Биз сизди күттүк',
    'phoneNumber': 'Телефон номери',
    'password': 'Сыр сөз',
    'forgotPassword': 'Сыр сөздү унуттуңузбу?',
    'signInWith': 'Же аркылуу кирүү',
    'noAccount': 'Аккаунт жокпу?',
    'signUp': 'Катталуу',
    'signInButton': 'Кирүү',
    'signingIn': 'Кирүүдө...',
    
    // Dashboard
    'courierPanel': 'Курьердин панели',
    'manageOrders': 'Буйрутмаларыңызды башкарып, жеткирүүлөрдү көзөмөлдөңүз',
    'updated': 'Жаңыртылды',
    'available': 'Жеткиликтүү',
    'inWork': 'Иште',
    'delivered': 'Жеткирилди',
    'canceled': 'Жокко чыгарылган',
    'availableOrders': 'Жеткиликтүү буйрутмалар',
    'myOrders': 'Менин буйрутмаларым',
    'noAvailableOrders': 'Жеткиликтүү буйрутмалар жок',
    'noActiveOrders': 'Сизде активдүү буйрутмалар жок',
    'noCompletedOrders': 'Аяктаган буйрутмалар азырча жок',
    'noCanceledOrders': 'Жокко чыгарылган буйрутмалар азырча жок',
    'newOrdersHere': 'Жаңы буйрутмалар бул жерде автоматтык түрдө пайда болот',
    'acceptFromAvailable': 'Жеткиликтүү тизмеден буйрутма алыңыз',
    'completedOrdersHere': 'Аяктаган буйрутмалар бул жерде көрсөтүлөт',
    'canceledOrdersHere': 'Жокко чыгарылган буйрутмалар бул жерде көрсөтүлөт',
    'updateOrders': 'Буйрутмаларды жаңыртуу',
    'updating': 'Жаңыртууда...',
    'showAllCompleted': 'Бардык аяктаган буйрутмаларды көрсөтүү',
    
    // Статистика
    'statistics': 'Статистика',
    'statisticsShort': 'Стат.',
    'totalOrders': 'Жалпы буйрутмалар',
    'completedOrders': 'Аяктаган',
    'totalRevenue': 'Жалпы киреше',
    'averageOrder': 'Орточо чек',
    'canceledOrders': 'Жокко чыгарылган',
    'totalItems': 'Жеткирилген товарлар',
    'completionRate': 'Аяктоо пайызы',
    'activityByDays': 'Жума күндөрү боюнча активдүүлүк',
    'noStatistics': 'Статистика жеткиликтүү эмес',
    'statisticsDescription': 'Статистика биринчи буйрутмаларды аткаруудан кийин жеткиликтүү болот',
    'courierStatistics': 'Курьердин статистикасы',
    'ordersForPeriod': 'Тандалган мезгилдеги буйрутмалар',
    'statisticsInProgress': 'Жолдо',
    'statisticsEarned': 'Табылды',
    'som': 'сом',
    
    // Статусы заказов
    'created': 'Түзүлдү',
    'courierWait': 'Күтүүдө',
    'courierPicked': 'Кабыл алынды',
    'enroute': 'Жолдо',
    'deliveredStatus': 'Жеткирилди',
    
    // Действия
    'acceptOrder': 'Буйрутманы кабыл алуу',
    'startDelivery': 'Жеткирүүнү баштоо',
    'markDelivered': 'Жеткирилди',
    
    // Заказ
    'order': 'Буйрутма',
    'orderNumber': 'Буйрутма #',
    'customerInfo': 'Кардар жөнүндө маалымат',
    'customerName': 'Кардардын аты',
    'deliveryAddress': 'Жеткирүү дареги',
    'orderComment': 'Буйрутмага комментарий',
    'orderItems': 'Буйрутмадагы товарлар',
    'quantity': 'Саны',
    'totalAmount': 'Толук төлөө суммасы',
    'courier': 'Курьер',
    'courierName': 'Курьердин аты',
    'actions': 'Аракеттер',
    'hasComment': 'Комментарий бар',
    'items': 'товар',
    'item': 'товар',
    'items2': 'товар',
    
    // Навигация
    'storeCourier': 'StoreCourier',
    'courierCabinet': 'Курьердин жеке кабинети',
    'activeStatus': 'Активдүү',
    'logout': 'Чыгуу',
    'notifications': 'Билдирүүлөр',
    
    // Настройки
    'theme': 'Тема',
    'lightTheme': 'Ачык',
    'darkTheme': 'Караңгы',
    'language': 'Тил',
    'russian': 'Орусча',
    'kyrgyz': 'Кыргызча',
    
    // Профиль
    'completeProfile': 'Профилди толуктаңыз',
    'profilePrivacy': 'Тынчсызданбаңыз, жеке маалыматыңызды өзүңүз гана көрө аласыз',
    'editProfile': 'Профилди өзгөртүү',
    'changePhone': 'Телефонду өзгөртүү',
    'changePassword': 'Сыр сөздү өзгөртүү',
    'currentPhone': 'Азыркы телефон',
    'newPhone': 'Жаңы телефон',
    'enterPhone': 'Телефон номерин киргизиңиз',
    'currentPassword': 'Азыркы сыр сөз',
    'newPassword': 'Жаңы сыр сөз',
    'confirmPassword': 'Сыр сөздү ырастаңыз',
    'enterCurrentPassword': 'Азыркы сыр сөздү киргизиңиз',
    'enterNewPassword': 'Жаңы сыр сөздү киргизиңиз',
    'confirmNewPassword': 'Жаңы сыр сөздү ырастаңыз',
    'passwordMismatch': 'Сыр сөздөр дал келбейт',
    'cancelOrder': 'Буйрутманы жокко чыгаруу',
    'confirmCancelOrder': 'Буйрутманы жокко чыгарууну ырастоо',
    'confirmCancelText': 'Сиз чындап эле буйрутманы жокко чыгаргыңыз келеби',
    'pleaseSpecifyReason': 'Сураныч, жокко чыгаруунун себебин көрсөтүңүз:',
    'cancelReasonPlaceholder': 'Буйрутманы жокко чыгаруунун себебин көрсөтүңүз...',
    'confirmCancel': 'Жокко чыгаруу',
    'cancelling': 'Жокко чыгарууда...',
    'cancelCommentRequired': 'Буйрутманы жокко чыгаруу үчүн комментарий милдеттүү',
    'cancelComment': 'Жокко чыгаруунун комментарийи',
    'hasCancelComment': 'Жокко чыгаруунун комментарийи бар',
    'adminComment': 'Администратордун комментарийи',
    'hasAdminComment': 'Администратордун комментарийи бар',
    'customerComment': 'Кардардын комментарийи',
    'pcs': 'даана',
    'yourProfile': 'Сиздин профилиңиз',
    'loadingData': 'Маалыматтар жүктөлүүдө...',
    'notSpecified': 'Көрсөтүлгөн эмес',
    'enterNewName': 'Жаңы атыңызды киргизиңиз',
    'saving': 'Сактоодо...',
    'connectionError': 'Серверге туташуу катасы',
    'searchOrders': 'Буйрутмаларды издөө (ID, дарек, ат, телефон, товарлар...)',
    'lastUpdated': 'Жаңыланды',
    'date': 'Күн',
    
    // Фильтры и сортировка
    'filters': 'Фильтрлер',
    'sorting': 'Сорттоо',
    'period': 'Мөөнөт',
    'orderPrice': 'Буйрутманын баасы (сом)',
    'itemsCount': 'Товарлардын саны (даана)',
    'resetAll': 'Баарын тазалоо',
    'allTime': 'Бардык убакыт',
    'today': 'Бүгүн',
    'yesterday': 'Кечээ',
    'thisWeek': 'Ушул жума',
    'thisMonth': 'Ушул ай',
    'thisYear': 'Ушул жыл',
    'sortNewest': 'Алгач жаңылар',
    'sortOldest': 'Алгач эскилер',
    'sortPriceHigh': 'Баа: төмөндөн жогору',
    'sortPriceLow': 'Баа: жогорудан төмөн',
    'sortItemsHigh': 'Товарлар: көбүрөөк',
    'sortItemsLow': 'Товарлар: азыраак',
    'activeFilters': 'Активдүү фильтрлер:',
    'from': 'Башынан',
    'to': 'Аягына чейин',
    
    // Модальное окно заказов
    'products': 'Товарлар',
    'seller': 'Сатуучу',
    'product': 'товар',
    'products2': 'товар',
    'products5': 'товар',
    'client': 'Кардар',
    'phoneLabel': 'Телефон',
    'addressLabel': 'Дарек'
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru')

  useEffect(() => {
    // Загружаем язык из localStorage
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'ky')) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
