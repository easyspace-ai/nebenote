# Notebook 系统设计方案

## 概述

基于 DeerFlow 构建类似 NotebookLM 的产品，支持：
- 📚 **Notebook 管理**：创建、编辑、删除笔记本
- 📁 **多文档上传**：支持 PDF/Word/PPT/Excel，异步转换为 Markdown
- 💬 **多会话聊天**：一个 Notebook 对应多个会话线程
- @ **资料引用**：聊天时可 @ 特定文档进行针对性问答
- 🎨 **内容生成**：通过 Skill 生成 PPT、HTML、播客等

---

## 一、数据模型设计

### 1.1 存储目录结构

```
.deer-flow/
├── notebooks/
│   └── {notebook_id}/
│       ├── metadata.json           # Notebook 元数据
│       ├── documents/              # 文档存储区
│       │   ├── {doc_id}/
│       │   │   ├── original.pdf    # 原始文件
│       │   │   ├── converted.md    # 转换后的 Markdown
│       │   │   ├── chunks.json     # 语义分块（可选）
│       │   │   ├── outline.json    # 文档大纲
│       │   │   └── metadata.json   # 文档元数据
│       │   └── ...
│       ├── threads/                # 会话线程
│       │   ├── {thread_id}/        # 每个线程是标准 DeerFlow thread
│       │   │   └── user-data/
│       │   │       ├── workspace/
│       │   │       ├── uploads/    # 线程级临时上传
│       │   │       └── outputs/
│       │   └── ...
│       └── assets/                 # Notebook 生成的输出（PPT/HTML等）
│           ├── {asset_id}.pptx
│           ├── {asset_id}.html
│           └── ...
└── memory.json
```

### 1.2 元数据模型

**notebook/metadata.json**
```json
{
  "notebook_id": "nb_123456789",
  "title": "AI 研究笔记",
  "description": "关于大语言模型的研究资料集合",
  "created_at": 1712345678.0,
  "updated_at": 1712345678.0,
  "tags": ["AI", "LLM", "Research"],
  "document_ids": ["doc_abc", "doc_xyz"],
  "thread_ids": ["thread_123", "thread_456"],
  "settings": {
    "default_model": "claude-3-5-sonnet",
    "chunking_strategy": "semantic",
    "auto_summarize": true
  }
}
```

**notebook/documents/{doc_id}/metadata.json**
```json
{
  "doc_id": "doc_abc123",
  "original_filename": "2023-LLM-Survey.pdf",
  "file_type": "pdf",
  "file_size": 2456789,
  "title": "大语言模型综述 2023",
  "author": "张三等",
  "created_at": 1712345678.0,
  "status": "ready",  // pending, processing, ready, failed
  "conversion_error": null,
  "outline": [
    {"title": "摘要", "line": 1, "level": 1},
    {"title": "1. 引言", "line": 15, "level": 1}
  ],
  "stats": {
    "page_count": 42,
    "word_count": 15420,
    "chunk_count": 87
  }
}
```

---

## 二、后端架构设计

### 2.1 目录结构

```
backend/
├── packages/harness/deerflow/
│   ├── notebook/
│   │   ├── __init__.py
│   │   ├── models.py           # 数据模型
│   │   ├── manager.py          # Notebook 核心管理器
│   │   ├── document_store.py   # 文档存储
│   │   ├── processor.py        # 异步文档处理
│   │   ├── chunker.py          # 语义分块
│   │   ├── retriever.py        # 检索引擎
│   │   └── paths.py            # 路径配置
│   ├── agents/
│   │   └── middlewares/
│   │       └── notebook_middleware.py  # @文档引用注入
│   └── tools/builtins/
│       └── notebook_tools.py   # Notebook 专用工具
└── app/gateway/routers/
    └── notebooks.py            # Notebook API 端点
```

### 2.2 核心模块设计

**notebook/models.py** - Pydantic 数据模型
```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class Document(BaseModel):
    doc_id: str
    original_filename: str
    file_type: str
    title: str
    status: DocumentStatus
    created_at: float

class Notebook(BaseModel):
    notebook_id: str
    title: str
    description: Optional[str]
    documents: List[Document]
    thread_ids: List[str]
    created_at: float
    updated_at: float
```

**notebook/manager.py** - Notebook 管理器
```python
class NotebookManager:
    def create_notebook(self, title: str, description: str = None) -> Notebook
    def get_notebook(self, notebook_id: str) -> Notebook
    def list_notebooks(self) -> List[Notebook]
    def delete_notebook(self, notebook_id: str)
    def add_document(self, notebook_id: str, file: UploadFile) -> Document
    def get_document(self, notebook_id: str, doc_id: str) -> Document
    def list_documents(self, notebook_id: str) -> List[Document]
    def create_thread(self, notebook_id: str, title: str = None) -> str
    def list_threads(self, notebook_id: str) -> List[str]
```

**notebook/processor.py** - 异步文档处理
```python
from concurrent.futures import ThreadPoolExecutor
import asyncio

class DocumentProcessor:
    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.task_status: Dict[str, Dict] = {}

    async def process_document_async(
        self,
        notebook_id: str,
        doc_id: str,
        file_path: Path
    ) -> str:
        """异步处理文档：转换 -> 分块 -> 索引"""
        task_id = f"{notebook_id}_{doc_id}"
        self.task_status[task_id] = {"status": "processing"}

        try:
            # 1. 转换为 Markdown
            md_path = await asyncio.to_thread(
                self._convert_to_markdown, file_path
            )

            # 2. 提取大纲
            outline = await asyncio.to_thread(
                extract_outline, md_path
            )

            # 3. 语义分块（可选）
            chunks = await asyncio.to_thread(
                self._chunk_document, md_path
            )

            self.task_status[task_id] = {
                "status": "ready",
                "outline": outline,
                "chunks_count": len(chunks)
            }
            return doc_id

        except Exception as e:
            self.task_status[task_id] = {
                "status": "failed",
                "error": str(e)
            }
            raise

    def get_processing_status(self, notebook_id: str, doc_id: str) -> Dict
```

**notebook/chunker.py** - 语义分块
```python
class DocumentChunker:
    def chunk_by_section(self, md_text: str) -> List[Chunk]
    def chunk_semantic(
        self,
        md_text: str,
        chunk_size: int = 1000,
        overlap: int = 200
    ) -> List[Chunk]
```

**notebook/retriever.py** - 检索引擎
```python
class DocumentRetriever:
    def retrieve_relevant(
        self,
        notebook_id: str,
        query: str,
        doc_ids: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[RetrievalResult]
```

### 2.3 @文档引用机制

**agents/middlewares/notebook_middleware.py**
```python
class NotebookMiddleware(BaseMiddleware):
    """处理 @文档 引用，注入相关文档上下文"""

    async def before_model(self, state: ThreadState, config: RunnableConfig):
        # 1. 解析消息中的 @doc_id 引用
        message = get_last_human_message(state)
        referenced_doc_ids = self._extract_doc_refs(message.content)

        if not referenced_doc_ids:
            return state

        # 2. 从 notebook 获取文档内容
        notebook_id = config["configurable"]["notebook_id"]
        context_sections = []

        for doc_id in referenced_doc_ids:
            doc = notebook_manager.get_document(notebook_id, doc_id)
            md_content = read_file(doc.converted_md_path)

            # 3. 如果有 query，进行语义检索
            if self._has_query(message.content):
                relevant_chunks = retriever.retrieve_relevant(
                    notebook_id,
                    message.content,
                    doc_ids=[doc_id],
                    top_k=3
                )
                context = self._format_chunks(relevant_chunks)
            else:
                # 否则注入文档大纲 + 前 N 段
                context = self._format_document_overview(doc, md_content)

            context_sections.append(context)

        # 4. 注入到消息中
        augmented_content = self._inject_context(
            message.content,
            context_sections
        )
        replace_last_human_message(state, augmented_content)

        return state

    def _extract_doc_refs(self, content: str) -> List[str]:
        """提取 @doc_xxx 引用"""
        # 匹配 @doc_abc123 或 @[文档标题](doc_abc123)
        pattern = r'@doc_([a-zA-Z0-9]+)|@\[([^\]]+)\]\(doc_([a-zA-Z0-9]+)\)'
        ...
```

### 2.4 API 设计

**app/gateway/routers/notebooks.py**

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/notebooks` | POST | 创建 Notebook |
| `/api/notebooks` | GET | 列出所有 Notebook |
| `/api/notebooks/{id}` | GET | 获取 Notebook 详情 |
| `/api/notebooks/{id}` | PUT | 更新 Notebook |
| `/api/notebooks/{id}` | DELETE | 删除 Notebook |
| `/api/notebooks/{id}/documents` | POST | 上传文档 |
| `/api/notebooks/{id}/documents` | GET | 列出文档 |
| `/api/notebooks/{id}/documents/{doc_id}` | GET | 获取文档详情 |
| `/api/notebooks/{id}/documents/{doc_id}` | DELETE | 删除文档 |
| `/api/notebooks/{id}/documents/{doc_id}/status` | GET | 获取处理状态 |
| `/api/notebooks/{id}/threads` | POST | 创建会话线程 |
| `/api/notebooks/{id}/threads` | GET | 列话线程 |
| `/api/notebooks/{id}/search` | POST | 搜索 Notebook 内容 |
| `/api/notebooks/{id}/assets` | GET | 列出生成的资源 |

---

## 三、前端架构设计

### 3.1 目录结构

```
frontend/src/
├── pages/
│   └── notebooks/
│       ├── index.tsx           # Notebook 列表页
│       ├── [id]/
│       │   ├── index.tsx       # Notebook 详情页
│       │   ├── documents.tsx   # 文档管理页
│       │   └── threads/
│       │       └── [threadId]/index.tsx  # 会话页
│
├── components/notebook/
│   ├── NotebookList.tsx
│   ├── NotebookCard.tsx
│   ├── DocumentUploader.tsx
│   ├── DocumentList.tsx
│   ├── DocumentViewer.tsx
│   ├── ThreadList.tsx
│   ├── NotebookChat.tsx
│   ├── DocumentMention.tsx     # @文档选择器
│   └── AssetGallery.tsx
│
├── core/notebook/
│   ├── api.ts                  # API 客户端
│   ├── types.ts                # TypeScript 类型
│   ├── hooks.ts                # React Hooks
│   └── store.ts                # Zustand 状态管理
```

### 3.2 核心组件

**DocumentUploader.tsx** - 支持拖拽、批量上传、进度显示
```tsx
interface DocumentUploaderProps {
  notebookId: string;
  onUploadComplete?: (docs: Document[]) => void;
}

function DocumentUploader({ notebookId, onUploadComplete }: Props) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const upload = useUploadDocuments(notebookId);

  const handleDrop = async (files: File[]) => {
    // 添加到上传队列
    setUploadingFiles(files.map(f => ({
      file: f,
      progress: 0,
      status: 'pending'
    })));

    // 并行上传
    const results = await Promise.all(
      files.map(file => upload.mutateAsync(file))
    );

    onUploadComplete?.(results);
  };

  return (
    <Dropzone onDrop={handleDrop}>
      {/* 上传区域 UI */}
      {/* 上传进度列表 */}
    </Dropzone>
  );
}
```

**DocumentMention.tsx** - @文档选择器
```tsx
// 在聊天输入框中输入 @ 时触发
function DocumentMentionPopover({
  notebookId,
  onSelect,
  onClose
}: Props) {
  const { data: documents } = useDocuments(notebookId);
  const [search, setSearch] = useState('');

  const filtered = documents?.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover>
      <Input
        placeholder="搜索文档..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <List>
        {filtered?.map(doc => (
          <ListItem
            key={doc.doc_id}
            onClick={() => {
              onSelect({
                id: doc.doc_id,
                title: doc.title,
                display: `@[${doc.title}](doc_${doc.doc_id})`
              });
            }}
          >
            <FileIcon type={doc.file_type} />
            <span>{doc.title}</span>
            {doc.status === 'processing' && <Spinner />}
            {doc.status === 'ready' && <CheckIcon />}
          </ListItem>
        ))}
      </List>
    </Popover>
  );
}
```

**NotebookChat.tsx** - 集成 @ 引用的聊天界面
```tsx
function NotebookChat({ notebookId, threadId }: Props) {
  const editorRef = useRef<Editor>();

  // 监听 @ 键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      e.preventDefault();
      showMentionPopover();
    }
  };

  // 插入 @ 引用
  const insertMention = (mention: Mention) => {
    editorRef.current?.insertText(mention.display);
  };

  return (
    <div>
      <ThreadMessages threadId={threadId} />
      <ChatInput
        ref={editorRef}
        onKeyDown={handleKeyDown}
        placeholder="输入消息，@ 引用文档..."
      />
      {showMention && (
        <DocumentMentionPopover
          notebookId={notebookId}
          onSelect={insertMention}
          onClose={() => setShowMention(false)}
        />
      )}
    </div>
  );
}
```

### 3.3 React Hooks

```ts
// core/notebook/hooks.ts
export function useNotebook(notebookId: string) {
  return useQuery({
    queryKey: ['notebook', notebookId],
    queryFn: () => notebookApi.get(notebookId)
  });
}

export function useDocuments(notebookId: string) {
  return useQuery({
    queryKey: ['notebook', notebookId, 'documents'],
    queryFn: () => notebookApi.listDocuments(notebookId)
  });
}

export function useUploadDocuments(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => notebookApi.uploadDocument(notebookId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notebook', notebookId, 'documents']
      });
    }
  });
}

export function useDocumentProcessingStatus(
  notebookId: string,
  docId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['document', docId, 'status'],
    queryFn: () => notebookApi.getProcessingStatus(notebookId, docId),
    refetchInterval: (data) =>
      data?.status === 'processing' ? 1000 : false,
    enabled
  });
}
```

---

## 四、Skill 集成设计

### 4.1 生成 PPT Skill

**skills/public/notebook-ppt-generation/SKILL.md**
```markdown
# Notebook PPT 生成 Skill

当用户要求基于 Notebook 中的文档生成 PPT 时使用此 Skill。

## 用法

```python
# 1. 先列出 Notebook 中的文档
ls /mnt/notebook/documents/

# 2. 读取相关文档的 Markdown
read_file /mnt/notebook/documents/doc_abc123/converted.md

# 3. 生成 PPT 大纲
write_file /mnt/user-data/workspace/ppt-outline.json <<EOF
{
  "title": "...",
  "slides": [...]
}
EOF

# 4. 调用生成脚本
python /mnt/skills/public/notebook-ppt-generation/scripts/generate.py \
  --outline /mnt/user-data/workspace/ppt-outline.json \
  --output /mnt/notebook/assets/ppt_123.pptx
```
```

### 4.2 生成 HTML 报告 Skill

类似 PPT 生成 Skill，输出交互式 HTML 报告。

### 4.3 Skill 调用流程

1. 用户在聊天中说："基于这三篇文档生成一份 PPT"
2. Agent 通过 `notebook_middleware` 知道当前在哪个 Notebook
3. Agent 读取相关文档，生成大纲
4. Agent 调用 PPT Skill
5. 生成的 PPT 保存到 `/notebooks/{id}/assets/`
6. 前端通过 `/api/notebooks/{id}/assets` 列出并展示

---

## 五、与现有 DeerFlow 的集成

### 5.1 Thread 映射

```
DeerFlow Thread ←→ Notebook Thread

每个 Notebook 中的会话线程实际上是一个标准的 DeerFlow thread，
但我们在 thread 的 metadata 中标记：
{
  "notebook_id": "nb_123456",
  "notebook_thread": true
}
```

### 5.2 路径映射

在 Sandbox 中，Notebook 目录挂载为：

```
/mnt/notebook/              → .deer-flow/notebooks/{id}/
/mnt/notebook/documents/    → .deer-flow/notebooks/{id}/documents/
/mnt/notebook/assets/       → .deer-flow/notebooks/{id}/assets/
/mnt/user-data/             → .deer-flow/notebooks/{id}/threads/{thread_id}/user-data/
```

### 5.3 Middleware 集成

在现有 Middleware 链中插入：

```python
# agents/lead_agent/agent.py
middlewares = [
    ThreadDataMiddleware(),
    NotebookMiddleware(),      # ← 新增：@文档引用处理
    UploadsMiddleware(),
    SandboxMiddleware(),
    # ... 其他 middlewares
]
```

---

## 六、实施路线图

### Phase 1: 核心 Notebook 管理（1-2周）
- [ ] Notebook CRUD API
- [ ] 前端 Notebook 列表/详情页
- [ ] 文档上传（复用现有 upload 逻辑）

### Phase 2: 文档处理（1周）
- [ ] 异步转换队列
- [ ] 处理状态轮询
- [ ] 文档查看器

### Phase 3: 会话与 @引用（2周）
- [ ] Notebook Thread 管理
- [ ] NotebookMiddleware
- [ ] 前端 @ 文档选择器

### Phase 4: Skill 集成（1-2周）
- [ ] PPT 生成 Skill
- [ ] HTML 报告生成 Skill
- [ ] 资产画廊 UI

### Phase 5: 高级功能（可选）
- [ ] 语义分块与检索
- [ ] 向量数据库集成
- [ ] 文档交叉引用
- [ ] 多用户协作

---

## 七、关键技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 元数据存储 | JSON 文件 | 简单、可审计、无需额外数据库 |
| 异步处理 | ThreadPoolExecutor | 简单有效，避免引入 Celery |
| 文档分块 | 按标题分段 + 语义块 | 平衡质量与复杂度 |
| 检索方案 | 可选向量集成 | 初期可用简单 grep，后期可升级 |
| 前端状态 | React Query + Zustand | DeerFlow 现有方案 |
