// 枚举中文映射（前后端共用）

export const CLOTHING_TYPE_LABEL: Record<string, string> = {
  TOP: "上衣",
  BOTTOM: "裤子",
  SKIRT: "裙子",
  OUTER: "外套",
  SHOE: "鞋",
  HAT: "帽子",
  ACCESSORY: "配饰",
};

export const SEASON_LABEL: Record<string, string> = {
  SPRING: "春",
  SUMMER: "夏",
  AUTUMN: "秋",
  WINTER: "冬",
};

export const OCCASION_LABEL: Record<string, string> = {
  COMMUTE: "通勤",
  SPORT: "运动",
  FORMAL: "正式",
  CASUAL: "休闲",
};

export const STORAGE_CATEGORY_LABEL: Record<string, string> = {
  APPLIANCE: "家电",
  TOOL: "工具",
  DAILY: "日用品",
  MEDICINE: "药品",
  DOCUMENT: "证件",
  SEASONAL: "季节性物品",
  OTHER: "其他",
};

export const PROGRESS_LABEL: Record<string, string> = {
  ONGOING: "进行中",
  DONE: "已完成",
  PAUSED: "搁置",
};

export const PLANT_STATUS_LABEL: Record<string, string> = {
  GROWING: "生长中",
  READY: "待采收",
  COMPLETED: "已完成",
  FAILED: "失败重种",
};

export const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "公开",
  PRIVATE: "私密",
};
