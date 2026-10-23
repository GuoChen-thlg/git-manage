/**
 * bun 运行时全局对象的最小类型声明
 * Bun 由 bun 运行时在启动时注入，本项目不引入 @types/bun，
 * 仅声明 service/main.ts 实际用到的成员
 */
declare const Bun: {
  /** 启动 HTTP 服务 */
  serve(options: {
    /** 监听端口 */
    port: number;
    /** 请求处理函数 */
    fetch: (request: Request) => Response | Promise<Response>;
  }): void;
};
