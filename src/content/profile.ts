/**
 * ============================================================
 *  公开主页文案配置 —— 改这里就能更新整个主页，不用碰页面代码
 *  改完 git push，Vercel 会自动重新部署
 * ============================================================
 */

export const profile = {
  /** 名字 / 站点主标识 */
  name: "Song",
  /** 导航栏显示的名字（可与 name 相同） */
  brand: "Song",
  /** 身份 / 职位 */
  role: "开发者 · 生活记录者",
  /** 首屏大标题下的第一句话 */
  tagline: "把日子过成可检索的样子。",
  /** 首屏补充说明 */
  subtitle:
    "这里是我个人的线上空间：记录旅行与阅读，整理工作与爱好，也持续把想法做成真正能用的东西。",

  /** 「关于」板块，可写多段 */
  about: [
    "你好，我是 Song。这个站点是我自己一点点搭起来的个人空间，既是作品集，也是生活与知识的归档处。",
    "公开页面展示我的项目与近况；登录后可以看到更完整的「我的频道」——生活、图书馆、工作三大板块，数据云端同步。",
  ],

  /** 技能分组 */
  skills: [
    { category: "开发", items: ["TypeScript", "Next.js", "React", "Tailwind CSS"] },
    { category: "数据与部署", items: ["PostgreSQL / Prisma", "Vercel", "GitHub", "Docker"] },
    { category: "设计与内容", items: ["界面设计", "写作与整理", "摄影", "信息架构"] },
  ],

  /** 频道卡片：对应站内真实模块 */
  channels: [
    {
      title: "生活",
      description: "旅行摄影、衣橱穿搭、餐饮、园艺、兴趣爱好与家庭仓储。把日常好好收起来。",
      tags: ["旅行", "穿搭", "园艺"],
      icon: "heart",
    },
    {
      title: "图书馆",
      description: "读书笔记、影评、专业学习与日记。输入过的东西，都值得留下痕迹。",
      tags: ["读书", "影评", "笔记"],
      icon: "book",
    },
    {
      title: "工作",
      description: "项目记录、思路沉淀与待办推进。工作上走过的路，也要有迹可循。",
      tags: ["项目", "沉淀"],
      icon: "briefcase",
    },
  ],

  /** 联系方式 */
  email: "867137422@qq.com",
  github: "https://github.com/SONGDD152",
  gitee: "", // 没有可留空
  /** 页脚 */
  footerNote: "© 2026 Song · 慢慢搭建，持续更新",
};

export type Profile = typeof profile;
