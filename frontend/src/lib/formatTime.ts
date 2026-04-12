function toDate(input: string | number): Date {
  if (typeof input === "number") {
    const ms = input < 1_000_000_000_000 ? input * 1000 : input;
    return new Date(ms);
  }
  return new Date(input);
}

export function formatRelativeTime(dateInput: string | number): string {
  const date = toDate(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "刚刚";
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`;
  } else {
    return date.toLocaleDateString("zh-CN");
  }
}

export function formatDate(dateInput: string | number): string {
  const date = toDate(dateInput);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateInput: string | number): string {
  const date = toDate(dateInput);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
