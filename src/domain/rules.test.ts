import { describe, expect, it } from "vite-plus/test";
import {
  DEFAULT_GROUP_ID,
  DEFAULT_GROUP_NAME,
  DEFAULT_NOTE_TITLE,
  GROUP_NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type Note,
} from "./models";
import {
  clampTitle,
  createDefaultGroupRecord,
  filterNotes,
  isDefaultGroup,
  isTitleAtLimit,
  nextDefaultGroupName,
  normalizeGroupName,
  resolveCreateNoteGroupId,
  selectNextNoteAfterDelete,
  sortGroupsByOrder,
  sortNotesByUpdatedAt,
  validateGroupName,
} from "./rules";

function makeNote(partial: Partial<Note> & Pick<Note, "id">): Note {
  return {
    groupId: DEFAULT_GROUP_ID,
    title: DEFAULT_NOTE_TITLE,
    content: "",
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe("validateGroupName", () => {
  it("去除首尾空格后校验通过", () => {
    const result = validateGroupName("  工作  ", ["生活"]);
    expect(result).toEqual({ ok: true, name: "工作" });
  });

  it("空名称或纯空格不可提交", () => {
    expect(validateGroupName("", []).ok).toBe(false);
    const blank = validateGroupName("   ", []);
    expect(blank.ok).toBe(false);
    if (!blank.ok) {
      expect(blank.reason).toBe("empty");
    }
  });

  it("完全重复名称不可提交", () => {
    const result = validateGroupName("工作", ["生活", "工作"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("duplicate");
    }
  });

  it("超过 40 字符不可提交", () => {
    const result = validateGroupName("字".repeat(GROUP_NAME_MAX_LENGTH + 1), []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("too_long");
    }
  });

  it("normalizeGroupName 只做 trim", () => {
    expect(normalizeGroupName("  a  ")).toBe("a");
  });
});

describe("clampTitle", () => {
  it("不超过 120 字符时原样返回", () => {
    expect(clampTitle("hello")).toBe("hello");
  });

  it("超过 120 字符时截断", () => {
    const long = "a".repeat(TITLE_MAX_LENGTH + 10);
    const clamped = clampTitle(long);
    expect(clamped).toHaveLength(TITLE_MAX_LENGTH);
    expect(isTitleAtLimit(clamped)).toBe(true);
  });
});

describe("filterNotes and sortNotesByUpdatedAt", () => {
  const notes: Note[] = [
    makeNote({ id: "1", groupId: DEFAULT_GROUP_ID, title: "A", updatedAt: 10 }),
    makeNote({ id: "2", groupId: "g1", title: "B", updatedAt: 30 }),
    makeNote({ id: "3", groupId: "g1", title: "C", updatedAt: 20 }),
    makeNote({ id: "4", groupId: "g2", title: "D", updatedAt: 40 }),
  ];

  it("全部笔记返回所有项并按 updatedAt 倒序", () => {
    const result = filterNotes(notes, "all");
    expect(result.map((note) => note.id)).toEqual(["4", "2", "3", "1"]);
  });

  it("默认分组只返回该分组笔记", () => {
    const result = filterNotes(notes, { groupId: DEFAULT_GROUP_ID });
    expect(result.map((note) => note.id)).toEqual(["1"]);
  });

  it("具体分组只返回该分组笔记", () => {
    const result = filterNotes(notes, { groupId: "g1" });
    expect(result.map((note) => note.id)).toEqual(["2", "3"]);
  });

  it("sortNotesByUpdatedAt 不修改原数组", () => {
    const original = [...notes];
    sortNotesByUpdatedAt(notes);
    expect(notes).toEqual(original);
  });
});

describe("selectNextNoteAfterDelete", () => {
  it("优先选择同分组中最近更新的下一篇", () => {
    const notes: Note[] = [
      makeNote({ id: "a", groupId: "g1", updatedAt: 30 }),
      makeNote({ id: "b", groupId: "g1", updatedAt: 20 }),
      makeNote({ id: "c", groupId: DEFAULT_GROUP_ID, updatedAt: 40 }),
    ];
    const next = selectNextNoteAfterDelete(notes, notes[0]!);
    expect(next?.id).toBe("b");
  });

  it("同分组没有其他笔记时返回 null", () => {
    const notes: Note[] = [
      makeNote({ id: "a", groupId: "g1", updatedAt: 30 }),
      makeNote({ id: "c", groupId: DEFAULT_GROUP_ID, updatedAt: 40 }),
    ];
    const next = selectNextNoteAfterDelete(notes, notes[0]!);
    expect(next).toBeNull();
  });
});

describe("default group and create target", () => {
  it("默认使用“新建分组”，冲突时递增后缀", () => {
    expect(nextDefaultGroupName([])).toBe(DEFAULT_GROUP_NAME);
    expect(nextDefaultGroupName([DEFAULT_GROUP_NAME])).toBe(`${DEFAULT_GROUP_NAME} 2`);
    expect(nextDefaultGroupName([DEFAULT_GROUP_NAME, `${DEFAULT_GROUP_NAME} 2`])).toBe(
      `${DEFAULT_GROUP_NAME} 3`,
    );
  });

  it("未选具体分组时新建笔记进入默认分组", () => {
    expect(resolveCreateNoteGroupId("all")).toBe(DEFAULT_GROUP_ID);
    expect(resolveCreateNoteGroupId({ groupId: "g1" })).toBe("g1");
  });

  it("识别默认分组并置顶排序", () => {
    expect(isDefaultGroup(DEFAULT_GROUP_ID)).toBe(true);
    expect(isDefaultGroup("g1")).toBe(false);
    const sorted = sortGroupsByOrder([
      { id: "g1", name: "工作", order: 1, createdAt: 1, updatedAt: 1 },
      createDefaultGroupRecord(1),
      { id: "g2", name: "生活", order: 2, createdAt: 1, updatedAt: 1 },
    ]);
    expect(sorted[0]?.id).toBe(DEFAULT_GROUP_ID);
  });
});
