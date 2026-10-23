import { connectHost } from '@openchamber/sdk';

/** 面板共享宿主连接：connectHost 每次调用都会新建实例，全模块经此单例访问（ES 模块缓存保证唯一） */
export const host = connectHost();
