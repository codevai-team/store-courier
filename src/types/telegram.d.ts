declare module 'node-telegram-bot-api' {
  export = TelegramBot;
  
  declare class TelegramBot {
    constructor(token: string, options?: any);
    sendMessage(chatId: string | number, text: string, options?: any): Promise<any>;
    setWebHook(url: string, options?: any): Promise<boolean>;
    deleteWebHook(options?: any): Promise<boolean>;
    getWebHookInfo(): Promise<any>;
    getMe(): Promise<any>;
    onText(regexp: RegExp, callback: (msg: any) => void): void;
    on(event: string, callback: (msg: any) => void): void;
  }
}
