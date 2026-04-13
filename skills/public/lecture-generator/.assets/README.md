# Assets 目录

此目录用于存放生成的演示文稿文件和自定义模板。

## 目录结构

```
.assets/
├── output/          # 生成的演示文稿输出
│   └── *.html
├── templates/     # 自定义模板（可选）
│   └── *.html
└── README.md      # 本文件
```

## 输出文件命名规范

生成的演示文稿文件遵循以下命名规范：

```
{YYYYMMDD}_{HHMMSS}_{topic_slug}.html
```

例如：
```
20250413_143052_react_hooks_ru_men.html
```

## 忽略规则

`.assets/output/` 目录下的文件被 `.gitignore` 忽略，不会提交到版本控制。
如果需要保留某个演示文稿文件，请将其移动到项目其他位置。

## 自定义模板

如需使用自定义模板，请在 `templates/` 目录下创建 `.html` 文件，
并在调用生成脚本时通过 `--template` 参数指定模板路径。
