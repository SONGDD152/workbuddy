"use server";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function uid(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new Error("未登录");
  return id;
}

// ===== 旅行 =====
export async function createTravel(input: any) {
  const userId = await uid();
  return prisma.travel.create({
    data: {
      userId,
      title: input.title,
      date: new Date(input.date),
      location: input.location || null,
      description: input.description || null,
      images: input.images || [],
      visibility: input.visibility || "PRIVATE",
    },
  });
}
export async function updateTravel(id: string, patch: any) {
  const userId = await uid();
  return prisma.travel.updateMany({
    where: { id, userId },
    data: {
      title: patch.title,
      date: patch.date ? new Date(patch.date) : undefined,
      location: patch.location,
      description: patch.description,
      images: patch.images,
      visibility: patch.visibility,
    },
  });
}
export async function deleteTravel(id: string) {
  const userId = await uid();
  return prisma.travel.deleteMany({ where: { id, userId } });
}

// ===== 衣橱 =====
export async function createClothing(input: any) {
  const userId = await uid();
  return prisma.clothing.create({
    data: {
      userId,
      name: input.name,
      type: input.type,
      seasons: input.seasons || [],
      occasions: input.occasions || [],
      color: input.color || null,
      image: input.image || null,
    },
  });
}
export async function updateClothing(id: string, patch: any) {
  const userId = await uid();
  return prisma.clothing.updateMany({
    where: { id, userId },
    data: {
      name: patch.name,
      type: patch.type,
      seasons: patch.seasons,
      occasions: patch.occasions,
      color: patch.color,
      image: patch.image,
    },
  });
}
export async function deleteClothing(id: string) {
  const userId = await uid();
  return prisma.clothing.deleteMany({ where: { id, userId } });
}
export async function addOutfitFeedback(comboKey: string, adopted: boolean) {
  const userId = await uid();
  return prisma.outfitFeedback.create({ data: { userId, comboKey, adopted } });
}

// ===== 家庭仓储 =====
export async function createStorageItem(input: any) {
  const userId = await uid();
  return prisma.storageItem.create({
    data: {
      userId,
      name: input.name,
      category: input.category,
      room: input.room || null,
      position: input.position || null,
      barcode: input.barcode || null,
      image: input.image || null,
      note: input.note || null,
      visibility: input.visibility || "PRIVATE",
    },
  });
}
export async function updateStorageItem(id: string, patch: any) {
  const userId = await uid();
  return prisma.storageItem.updateMany({
    where: { id, userId },
    data: {
      name: patch.name,
      category: patch.category,
      room: patch.room,
      position: patch.position,
      barcode: patch.barcode,
      image: patch.image,
      note: patch.note,
    },
  });
}
export async function deleteStorageItem(id: string) {
  const userId = await uid();
  return prisma.storageItem.deleteMany({ where: { id, userId } });
}

// ===== 餐饮 =====
export async function createFoodRecord(input: any) {
  const userId = await uid();
  return prisma.foodRecord.create({
    data: {
      userId,
      meal: input.meal,
      name: input.name,
      note: input.note || null,
      calories: input.calories ?? null,
      image: input.image || null,
      recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
    },
  });
}
export async function deleteFoodRecord(id: string) {
  const userId = await uid();
  return prisma.foodRecord.deleteMany({ where: { id, userId } });
}

// ===== 兴趣爱好 =====
export async function createHobby(input: any) {
  const userId = await uid();
  return prisma.hobby.create({
    data: { userId, name: input.name, visibility: input.visibility || "PRIVATE" },
  });
}
export async function updateHobby(id: string, patch: any) {
  const userId = await uid();
  return prisma.hobby.updateMany({
    where: { id, userId },
    data: { name: patch.name, visibility: patch.visibility },
  });
}
export async function deleteHobby(id: string) {
  const userId = await uid();
  return prisma.hobby.deleteMany({ where: { id, userId } });
}
export async function createHobbyEntry(input: any) {
  const userId = await uid();
  const hobby = await prisma.hobby.findFirst({ where: { id: input.hobbyId, userId } });
  if (!hobby) throw new Error("领域不存在");
  return prisma.hobbyEntry.create({
    data: {
      hobbyId: input.hobbyId,
      content: input.content,
      status: input.status || "ONGOING",
      image: input.image || null,
    },
  });
}
export async function deleteHobbyEntry(id: string) {
  const userId = await uid();
  return prisma.hobbyEntry.deleteMany({
    where: { id, hobby: { userId } },
  });
}

// ===== 园艺 =====
export async function createVegetable(input: any) {
  const userId = await uid();
  return prisma.vegetable.create({
    data: {
      userId,
      name: input.name,
      growDays: input.growDays,
      suitableTerm: input.suitableTerm || null,
      tag: input.tag || null,
      isCustom: true,
    },
  });
}
export async function createGardenPlant(input: any) {
  const userId = await uid();
  const seed = input.seedDate ? new Date(input.seedDate) : new Date();
  const est = new Date(seed);
  est.setDate(est.getDate() + (input.growDays ?? 60));
  return prisma.gardenPlant.create({
    data: {
      userId,
      vegetable: input.vegetable,
      seedDate: seed,
      method: input.method || null,
      location: input.location || null,
      status: input.status || "GROWING",
      note: input.note || null,
      estHarvest: input.estHarvest ? new Date(input.estHarvest) : est,
    },
  });
}
export async function updateGardenPlant(id: string, patch: any) {
  const userId = await uid();
  return prisma.gardenPlant.updateMany({
    where: { id, userId },
    data: {
      vegetable: patch.vegetable,
      method: patch.method,
      location: patch.location,
      status: patch.status,
      note: patch.note,
      estHarvest: patch.estHarvest ? new Date(patch.estHarvest) : undefined,
    },
  });
}
export async function deleteGardenPlant(id: string) {
  const userId = await uid();
  return prisma.gardenPlant.deleteMany({ where: { id, userId } });
}

// ===== 读书 =====
export async function createBook(input: any) {
  const userId = await uid();
  return prisma.book.create({
    data: { userId, title: input.title, author: input.author || null, type: input.type || null, visibility: input.visibility || "PRIVATE" },
  });
}
export async function updateBook(id: string, patch: any) {
  const userId = await uid();
  return prisma.book.updateMany({ where: { id, userId }, data: { title: patch.title, author: patch.author, type: patch.type, visibility: patch.visibility } });
}
export async function deleteBook(id: string) {
  const userId = await uid();
  return prisma.book.deleteMany({ where: { id, userId } });
}
export async function addBookNote(input: any) {
  const userId = await uid();
  const book = await prisma.book.findFirst({ where: { id: input.bookId, userId } });
  if (!book) throw new Error("书籍不存在");
  return prisma.bookNote.create({ data: { bookId: input.bookId, content: input.content } });
}
export async function deleteBookNote(id: string) {
  const userId = await uid();
  return prisma.bookNote.deleteMany({ where: { id, book: { userId } } });
}
export async function saveBookReport(input: any) {
  const userId = await uid();
  const book = await prisma.book.findFirst({ where: { id: input.bookId, userId } });
  if (!book) throw new Error("书籍不存在");
  return prisma.bookReport.upsert({
    where: { bookId: input.bookId },
    create: { bookId: input.bookId, content: input.content, score: input.score ?? null, summary: input.summary ?? null },
    update: { content: input.content, score: input.score ?? null, summary: input.summary ?? null },
  });
}

// ===== 影评 =====
export async function createMovie(input: any) {
  const userId = await uid();
  return prisma.movie.create({ data: { userId, title: input.title, genre: input.genre || null, visibility: input.visibility || "PRIVATE" } });
}
export async function updateMovie(id: string, patch: any) {
  const userId = await uid();
  return prisma.movie.updateMany({ where: { id, userId }, data: { title: patch.title, genre: patch.genre, visibility: patch.visibility } });
}
export async function deleteMovie(id: string) {
  const userId = await uid();
  return prisma.movie.deleteMany({ where: { id, userId } });
}
export async function addMovieNote(input: any) {
  const userId = await uid();
  const m = await prisma.movie.findFirst({ where: { id: input.movieId, userId } });
  if (!m) throw new Error("影片不存在");
  return prisma.movieNote.create({ data: { movieId: input.movieId, content: input.content } });
}
export async function deleteMovieNote(id: string) {
  const userId = await uid();
  return prisma.movieNote.deleteMany({ where: { id, movie: { userId } } });
}
export async function saveMovieReport(input: any) {
  const userId = await uid();
  const m = await prisma.movie.findFirst({ where: { id: input.movieId, userId } });
  if (!m) throw new Error("影片不存在");
  return prisma.movieReport.upsert({
    where: { movieId: input.movieId },
    create: { movieId: input.movieId, content: input.content, score: input.score ?? null, summary: input.summary ?? null },
    update: { content: input.content, score: input.score ?? null, summary: input.summary ?? null },
  });
}

// ===== 专业学习 =====
export async function createStudy(input: any) {
  const userId = await uid();
  return prisma.study.create({ data: { userId, topic: input.topic, status: input.status || "ONGOING", visibility: input.visibility || "PRIVATE" } });
}
export async function updateStudy(id: string, patch: any) {
  const userId = await uid();
  return prisma.study.updateMany({ where: { id, userId }, data: { topic: patch.topic, status: patch.status, visibility: patch.visibility } });
}
export async function deleteStudy(id: string) {
  const userId = await uid();
  return prisma.study.deleteMany({ where: { id, userId } });
}
export async function addStudyNote(input: any) {
  const userId = await uid();
  const s = await prisma.study.findFirst({ where: { id: input.studyId, userId } });
  if (!s) throw new Error("主题不存在");
  return prisma.studyNote.create({ data: { studyId: input.studyId, content: input.content } });
}
export async function deleteStudyNote(id: string) {
  const userId = await uid();
  return prisma.studyNote.deleteMany({ where: { id, study: { userId } } });
}
export async function saveStudyReport(input: any) {
  const userId = await uid();
  const s = await prisma.study.findFirst({ where: { id: input.studyId, userId } });
  if (!s) throw new Error("主题不存在");
  return prisma.studyReport.upsert({
    where: { studyId: input.studyId },
    create: { studyId: input.studyId, content: input.content },
    update: { content: input.content },
  });
}

// ===== 日记 =====
export async function addDiary(content: string) {
  const userId = await uid();
  return prisma.diary.create({ data: { userId, content } });
}
export async function deleteDiary(id: string) {
  const userId = await uid();
  return prisma.diary.deleteMany({ where: { id, userId } });
}
