
var $copyData = function (data) {
    return JSON.parse(JSON.stringify(data))
}
function isJSON(str) {
    if (typeof str == 'string') {
        try {
            var obj = JSON.parse(str)
            if (typeof obj == 'object' && obj) {
                return true
            } else {
                return false
            }
        } catch (e) {
            return false
        }
    }
}
function axiosAsk(url, askType, params) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: askType,
            url: `${PRODUCT}/api/${url}${askType == "get" ? params : ''}`,
            data: askType == "get" ? "" : params,
            dataType: "JSON",
            success: resolve,
            error: reject,
        });
    });
}
Vue.component("theme-color-config", {
    name: 'theme-color-config',
    props: {
        project_id: {
            type: { Number, String },
            default: 0
        },
    },
    // template: document.querySelector('#color-theme-config').innerHTML,
    el: '#color-theme-config',
    computed: {
        activeLeft() {
            let activeIndex = -1
            let activeData = {}
            if (this.themeColorId == 'diy') {
                activeIndex = 0
                activeData = {
                    aid: 'diy',
                    color: '#f8f8f8',
                    name: '自定义',
                    child: [],
                }
            } else {
                activeIndex = this.themeColorList.findIndex((item) => item.child.find((val) => val.aid == this.themeColorId))
                if (activeIndex != -1) {
                    activeData = this.themeColorList[activeIndex]
                    if (this.diyThemeColor.aid) activeIndex += 1
                }
            }
            if (activeIndex < 0) activeIndex = 0
            return { left: `${activeIndex * 100 + 10}px`, activeData }
        },
        activeData() {
            if (this.presetsThemeConfigs.hasOwnProperty(this.themeColorId) && this.presetsThemeConfigs[this.themeColorId]?.hasOwnProperty(this.themeType)) {
                return this.presetsThemeConfigs[this.themeColorId][this.themeType]
            }
            let itemI = false
            this.themeColorList.find((item) => (itemI = item?.child.find((val) => val.aid == this.themeColorId)))

            return itemI ? itemI.themeConfig[this.themeType] : {}
        },
    },
    data() {
        return {
            predefineColors: [
                'rgba(255, 120, 110, 1)',
                'rgba(103, 162, 248, 1)',
                'rgba(5, 172, 156, 1)',
                'rgba(176, 141, 234, 1)',
                'rgba(235, 149, 75, 1)',
                'rgba(255, 194, 191, 1)',
                'rgba(213, 231, 254, 1)',
                'rgba(198, 238, 244, 1)',
                'rgba(243, 237, 254, 1)',
                'rgba(255, 247, 226, 1)',
                'rgba(0, 82, 199, 1)',
                'rgba(26, 104, 64, 1)',
                'rgba(235, 104, 30, 1)',
                'rgba(27, 37, 64, 1)',
                'rgba(24, 144, 255, 1)',
                'rgba(255, 69, 0, 1)',
                'rgba(255, 140, 0, 1)',
                'rgba(255, 77, 79, 1)',
                'rgba(255, 215, 0, 1)',
                'rgba(144, 238, 144, 1)',
                'rgba(0, 206, 209, 1)',
                'rgba(30, 144, 255, 1)',
                'rgba(199, 21, 133, 1)',
                'rgba(255, 69, 0, 0.68)',
                'rgba(255, 120, 0, 1)',
                'rgba(250, 212, 0, 1)',
                'rgba(144, 240, 144, 0.5)',
                'rgba(0, 186, 189, 1)',
                'rgba(31, 147, 255, 0.73)',
                'rgba(199, 21, 133, 0.46)'
            ],
            themeColorList: [],
            projectConfig: {},
            colorTitles: ['主色', '辅色', '配色', '点缀色', '基础色', '--', '--', '--', '--', '--'],
            themeType: 0,
            themeColorId: '',
            diyThemeColor: {},
            isShow: true,
            visibleOpen: false,
            presetsThemeConfigs: {},
        }
    },
    created() {

        window.addEventListener("message", (e) => {
            if (e.source === window || e.data === "loaded") return;
            let { type, data } = e.data;
            if (type == "pudataThemeColor") {
                // presetsThemeConfigs
                //监听页面初始化
                this.projectConfig = data;
                this.getCreatedData()
            }
        });
    },
    //卸载
    beforeDestroy() { },
    methods: {
        open() {
            this.visibleOpen = true
        },
        // 获取主题配置
        async getThemeConfig() {
            let { code, data, msg } = await axiosAsk("v5/698d3bc843830", "post", {
                project_id: this.project_id,
            });
            if (code != 1 || !data.preview_config_json || !isJSON(data.preview_config_json)) return;
            let projectConfig = JSON.parse(data.preview_config_json);
            if (projectConfig.presetsThemeConfigs && Object.keys(projectConfig.presetsThemeConfigs).length) {
                this.presetsThemeConfigs = projectConfig.presetsThemeConfigs;
                this.themeColorId = Object.keys(this.presetsThemeConfigs)[0]
                this.postMessage()
            }

        },
        async getThemeColorList() {
            let { data, code } = await axiosAsk('v5/6821abd17ad70', 'post', { is_new_data: 1 })
            if (code != 1) return
            let themeColorId = 0
            data.forEach((item) => {
                item.child = item.child.map(({ json, ...val }) => {
                    if (!themeColorId) themeColorId = val.aid
                    if (this.projectConfig.presetsThemeConfigs.hasOwnProperty(val.aid)) {
                        if (!this.themeColorId) this.themeColorId = val.aid
                        return { ...val, themeConfig: this.projectConfig.presetsThemeConfigs[val.aid], }
                    } else {
                        let jsonData = JSON.parse(json)
                        return { ...jsonData, ...val, }
                    }
                })
            })
            if (!this.themeColorId) this.themeColorId = themeColorId
            this.themeColorList = data
        },
        resetThemeColor() {
            this.$delete(this.presetsThemeConfigs, this.themeColorId)
        },
        getCreatedData() {
            if (!this.themeColorId && this.projectConfig.themeColorId) {
                this.themeColorId = this.projectConfig.themeColorId
            }
            this.getThemeConfig()
            this.getThemeColorList()
        },
        showMore() {
            this.isShow = !this.isShow
        },
        async handleConfirm() {
            // if (!this.presetsThemeConfigs.hasOwnProperty(this.themeColorId)) {
            //     this.$set(this.presetsThemeConfigs, this.themeColorId, [this.activeData])
            // }
            this.presetsThemeConfigs = { [this.themeColorId]: [this.activeData] }
            let { data, code, msg } = await axiosAsk('v5/698d3beccb222', 'post', { project_id: this.project_id, preview_config_json: JSON.stringify({ presetsThemeConfigs: this.presetsThemeConfigs }) })
            if (code != 1) {
                this.$message({
                    message: msg,
                    type: 'error'
                })
                return
            }
            this.visibleOpen = false
            this.postMessage()
        },
        postMessage() {
            window.themeColorConfig = this.presetsThemeConfigs[this.themeColorId]
            window.frames[0].postMessage(
                {
                    type: "pudataPresetsThemeConfigs",
                    data: { themeColorId: this.themeColorId, presetsThemeConfig: this.presetsThemeConfigs[this.themeColorId] },
                },
                "*",
            );
        },
        openInputPopup(item, key, index) {
            let that = this
            this.$prompt('请输入颜色', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputValue: item[key][index],
                inputType: 'color'
            }).then(({ value }) => {
                that.bgColorArrow(item, key, index, value)
            }).catch(() => {
            });
        },
        bgColorArrow(item, key, index, value) {
            let data = $copyData(item)
            data[key][index] = value
            this.$set(this.presetsThemeConfigs, this.themeColorId, [data])
        },
        selectThemeColor(item) {
            if (item.aid === 'diy') {
                this.themeColorId = 'diy'
                return
            }
            this.themeColorId = item.child[0].aid
        },
    },
})
