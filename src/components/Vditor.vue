<template>
    <div id="vditor" class="vditor vditor--fullscreen"></div>
</template>

<script async>
    import Vditor from "vditor";
    import { MessageBox } from 'element-ui';
    // import { Notification } from 'element-ui';
    import * as dialog from 'tauri/api/dialog'
    import {writeFile, readTextFile} from 'tauri/api/fs'

    export default {
        name: "Vditor.vue",
        data (){
            return {
                vditor: '',
                welcome: '# 🎉️ Welcome to use Tauri Markdown!',
            };
        },
        mounted () {
            let self = this
            this.vditor = new Vditor('vditor', {
                // mode: 'sv', 默认为即时渲染模式
                // cdn: '..',
                cache: {
                    enable: false,
                },
                placeholder: self.welcome,
                minHeight: 600,
                width: 'auto',
                outline: true, // 大纲模式
                counter: {
                    enable: 102400, // 计数，提示角标问题
                },
                toolbarConfig: {
                    pin: true,
                },
                toolbar: [
                    {
                        name: "open_save",
                        tip: "打开/保存",
                        icon: '<svg t="1597727407471" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1167" width="32" height="32"><path d="M376.832 474.112H130.048c-33.792 0-61.44-27.648-61.44-61.44V165.888c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c-0.512 33.792-27.648 60.928-61.952 60.928zM130.048 165.888v247.296h247.296V165.888H130.048zM739.84 525.312c-16.384 0-31.744-6.144-43.52-17.92L521.728 332.8c-11.776-11.776-17.92-27.136-17.92-43.52s6.144-31.744 17.92-43.52L696.32 71.168c11.776-11.776 27.136-17.92 43.52-17.92s31.744 6.144 43.52 17.92L957.952 245.76c11.776 11.776 17.92 27.136 17.92 43.52s-6.144 31.744-17.92 43.52L783.36 507.392c-11.776 11.776-27.136 17.92-43.52 17.92z m0-411.136l-174.592 174.592 174.592 174.592 174.592-174.592-174.592-174.592zM376.832 960.512H130.048c-33.792 0-61.44-27.648-61.44-61.44v-247.296c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c-0.512 34.304-27.648 61.44-61.952 61.44z m-246.784-308.224v247.296h247.296v-247.296H130.048zM863.232 960.512h-247.296c-33.792 0-61.44-27.648-61.44-61.44v-247.296c0-33.792 27.648-61.44 61.44-61.44h247.296c33.792 0 61.44 27.648 61.44 61.44v247.296c0 34.304-27.136 61.44-61.44 61.44z m-246.784-308.224v247.296h247.296v-247.296h-247.296z" p-id="1168"></path></svg>',
                        toolbar: [
                            {
                                name: "open_md",
                                icon: '打开MD',
                                click (){
                                    self.open_md()
                                }
                            },
                            {
                                name: "export_md",
                                icon: '导出MD',
                                click() {
                                    return self.save_md()
                                }
                            },
                        ],
                    },
                    "|",
                    "emoji",
                    "headings",
                    "bold",
                    "italic",
                    "strike",
                    "link",
                    "|",
                    "list",
                    "ordered-list",
                    "check",
                    "outdent",
                    "indent",
                    "|",
                    "quote",
                    "line",
                    "code",
                    "inline-code",
                    "insert-before",
                    "insert-after",
                    // "|",
                    // "upload",
                    // "record",
                    "table",
                    "|",
                    "undo",
                    "redo",
                    "|",
                    // "fullscreen",
                    "edit-mode",
                    {
                        name: "more",
                        toolbar: [
                            // "export",
                            "outline",
                            "preview",
                            "both",
                            "code-theme",
                            "content-theme",
                            "devtools",
                            // "info",
                            // "help",
                            {
                                name: "about",
                                icon: '关于',
                                click (){
                                    self.show_about()
                                }
                            },
                        ],
                    }],
                preview:{
                    delay: 200,
                },
                after: () => {
                    // this.vditor.setValue('# 🎉️ Welcome to use Tauri Vditor!')
                }
            })
        },
        methods: {
            async open_md(){
                const file_path  = await dialog.open({
                    filter: 'md',
                })
                // Notification.info(JSON.stringify(file_path))
                let result = await readTextFile(file_path)
                // Notification.info(JSON.stringify(result))
                this.vditor.setValue(result)
            },
            async save_md(){
                const file_path = await dialog.save({
                    filter: 'md',
                })
                await writeFile({
                    path: file_path,
                    contents: this.vditor.getValue()
                })
            },
            show_about(){
                MessageBox.alert('这是基于Tauri和Vditor的本地MarkDown工具<br/>欢迎使用~<br/> ©MIT by jeeinn', '', {
                    dangerouslyUseHTMLString: true
                });
            }
        },
    }
</script>

<style scoped>
@import "~vditor/dist/index.css";
@import '~element-ui/lib/theme-chalk/index.css';
</style>