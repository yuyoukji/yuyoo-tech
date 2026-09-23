class AnnotationDrawer {
    constructor(container, config = {}) {
        // 初始化jsPlumb实例
        this.jsPlumbInstance = null;
        this.container = container;
        this.annotations = [];
        this.tempDiv = null; // 缓存临时div用于测量文本

        // 基础配置
        this.config = {
            fontSize: 14,
            fontFamily: 'Arial',
            paddingX: 12,
            paddingY: 8,
            lineHeight: 20,
            lineWidth: 2,
            minWidth: 100,  // 基础宽度
            minHeight: 60,  // 基础高度
            borderRadius: 6,
            minSpacing: 15, // 标注间距（优化后会自适应）
            arrowSize: 6,
            safeArea: 375,
            ...config
        };

        // 计算中心点
        this.centerX = container.offsetWidth / 2;
        // 根据安全区计算左右边界
        this.updateBoundaries();

        // 初始化jsPlumb
        this.initJsPlumb();
    }

    // 初始化jsPlumb
    initJsPlumb() {
        // 从全局对象访问jsPlumb
        this.jsPlumbInstance = jsPlumb.getInstance({
            Container: this.container,
            // 连接样式
            ConnectionOverlays: [
                ["Arrow", {
                    location: 1,
                    id: "arrow",
                    length: 5,
                    width: 5,
                    foldback: 0.8
                }]
            ],

            // 避免自动连接到锚点
            ConnectionsDetachable: false,
            ReattachConnections: false
        });
    }

    // 更新边界值方法
    updateBoundaries() {
        const { safeArea } = this.config;

        // 根据中心点和安全区宽度计算左右边界
        this.config.leftBoundary = this.centerX - (safeArea / 2);
        this.config.rightBoundary = this.centerX + (safeArea / 2);

        // 计算左右两侧最大可用宽度
        this.config.leftMaxWidth = this.config.leftBoundary - 40; // 左侧最大宽度
        this.config.rightMaxWidth = this.container.offsetWidth - this.config.rightBoundary - 40; // 右侧最大宽度
    }

    // 设置标注数据
    setAnnotations(annotations) {
        this.clearAnnotations();
        this.annotations = annotations.map(annotation => ({
            ...annotation,
            id: annotation.id || String(Date.now() + Math.random())
        }));

        this.renderAnnotations();
    }

    // 获取标注数据
    getAnnotations() {
        return [...this.annotations]; // 返回副本以防止外部修改
    }

    // 添加单个标注
    addAnnotation(annotation) {
        const normalizedAnnotation = {
            ...annotation,
            id: annotation.id || String(Date.now() + Math.random()) // 确保唯一ID
        };
        const index = this.annotations.findIndex(item => item.id === normalizedAnnotation.id);
        if (index !== -1) {
            // 如果ID已存在，则更新该标注
            this.annotations[index] = normalizedAnnotation;
            // 移除旧DOM元素并重新渲染
            this.removeAnnotation(normalizedAnnotation.id);
        }

        this.annotations.push(normalizedAnnotation);
        this.renderAnnotation(normalizedAnnotation);
        return normalizedAnnotation.id;
    }

    // 删除标注
    removeAnnotation(id) {
        // 从DOM中移除标注元素
        const annotationElement = document.getElementById(`annotation-${id}`);
        if (annotationElement) {
            annotationElement.remove();
        }

        // 从数组中移除标注
        this.annotations = this.annotations.filter(a => a.id !== id);

        // 重新渲染所有连接
        this.redrawConnections();
    }

    // 清空所有标注
    clearAnnotations() {
        // 清空DOM中的所有标注元素
        this.container.querySelectorAll('.annotation-box, .source-point').forEach(el => el.remove());

        // 清空jsPlumb连接
        if (this.jsPlumbInstance) {
            this.jsPlumbInstance.deleteEveryEndpoint();
        }

        // 注意：这里不重置 this.annotations 数组，保留数据
    }

    // 获取标注尺寸信息 - 优化：确保获取真实渲染尺寸
    getAnnotationDimensions(annotationId) {
        const element = document.getElementById(`annotation-${annotationId}`);
        if (!element) return null;

        // 强制重排以确保尺寸是最新的
        element.offsetHeight; // 触发重排
        const rect = element.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        return {
            width: rect.width,
            height: rect.height,
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top
        };
    }

    /**
     * 渲染单个标注
     */
    renderAnnotation(annotation) {
        // 创建标注框元素
        const annotationBox = this.createAnnotationElement(annotation);
        // 添加到容器
        this.container.appendChild(annotationBox);
        // 确保DOM元素已添加后，再创建连接
        setTimeout(() => {
            this.createConnection(annotation);
        }, 0);
    }

    /**
     * 创建标注元素 - 优化：基于真实渲染尺寸计算位置，避免尺寸误差导致的压盖
     */
    createAnnotationElement(annotation) {
        const annotationBox = document.createElement('div');
        annotationBox.className = 'annotation-box';
        annotationBox.id = `annotation-${annotation.id}`;
        annotationBox.innerHTML = annotation.text || '';
        annotationBox.style.position = 'absolute';
        annotationBox.style.visibility = 'hidden'; // 先隐藏避免闪烁
        this.container.appendChild(annotationBox);

        // 获取真实渲染尺寸（关键优化点）
        const rect = annotationBox.getBoundingClientRect();
        const actualWidth = rect.width > this.config.minWidth ? rect.width : this.config.minWidth;
        const actualHeight = rect.height > this.config.minHeight ? rect.height : this.config.minHeight;

        // 临时移除，重新创建最终元素
        this.container.removeChild(annotationBox);

        // 创建最终的标注元素
        const finalBox = document.createElement('div');
        finalBox.className = 'annotation-box';
        finalBox.id = `annotation-${annotation.id}`;
        finalBox.innerHTML = annotation.text || '';
        finalBox.style.position = 'absolute';
        // finalBox.style.width = `${actualWidth}px`;
        // finalBox.style.height = `${actualHeight}px`;

        // 计算水平位置
        let x;
        const margin = 20;

        // 使用预计算的分组信息
        if (annotation._side === 'left') {
            // 左侧标注：确保不超出容器左边界
            const leftBoundaryX = this.config.leftBoundary - actualWidth - margin;
            const minLeftX = 0; // 容器左边界
            x = Math.max(minLeftX, leftBoundaryX);
        } else {
            // 右侧标注：确保不超出容器右边界
            const rightBoundaryX = this.config.rightBoundary + margin;
            const maxRightX = this.container.offsetWidth - actualWidth; // 容器右边界减去标注宽度
            x = Math.min(maxRightX, rightBoundaryX);
        }

        // 计算垂直初始位置（基于真实高度）
        let y = parseInt(annotation.top - (actualHeight / 2));
        if (y < 0) y = 0;
        // 确保不超出容器底部
        const maxY = this.container.offsetHeight - actualHeight;
        if (y > maxY) y = maxY;

        finalBox.style.left = `${x}px`;
        finalBox.style.top = `${y}px`;
        finalBox.style.visibility = 'visible'; // 显示元素

        return finalBox;
    }

    /**
     * 创建连接线
     */
    createConnection(annotation) {
        if (!this.jsPlumbInstance) {
            console.warn('jsPlumb instance not initialized');
            return;
        }

        // 确保目标元素存在
        const targetElement = document.getElementById(`annotation-${annotation.id}`);
        if (!targetElement) {
            console.warn(`Target element not found for annotation ${annotation.id}`);
            return;
        }

        // 创建并添加源点元素
        const sourceElement = this.createSourcePoint(annotation);
        this.container.appendChild(sourceElement);

        try {
            // 直接创建连接，不再使用setTimeout延迟
            // 先根据标注位置判断目标锚点方向（左侧标注→右锚点，右侧标注→左锚点）
            const isLeftSide = annotation._side === 'left';
            // 精准锚点配置：确保连线末端水平指向标注框
            // 源锚点：始终为中心点（0.5,0.5），目标锚点：水平方向的中点（左/右）
            const sourceAnchor = [0.5, 0.5, 0, 0]; // 源点中心锚点
            const targetAnchor = isLeftSide
                ? [1, 0.5, 0, 0]  // 左侧标注：右中锚点（水平向右，箭头向左）
                : [0, 0.5, 0, 0]; // 右侧标注：左中锚点（水平向左，箭头向右）;

            this.jsPlumbInstance.connect({
                source: sourceElement,
                target: targetElement,
                // 核心1：精准锚点确保连线末端水平
                anchors: [sourceAnchor, targetAnchor],
                // 核心2：优化Bezier曲线，确保末端水平指向锚点
                connector: ["Bezier", {
                    curviness: 10,
                    // 强制曲线末端水平
                    stub: [20, 20], // 固定Stub长度，保证末端水平
                    gap: 0, // 锚点与标注框无间隙
                    alwaysRespectStubs: true,
                    // 新增：强制连线优先水平/垂直，减少交叉
                    midpoint: 0.5,
                    orientation: "horizontal" // 强制水平方向连线（适配左右锚点
                }],
                // connector: ["Flowchart", {
                //     stub: [15, 15], // 缩短引出段（原10可能过短，导致转弯）
                //     gap: 5, // 减小连线与元素的间距（原10可能导致偏移）
                //     cornerRadius: 3, // 减小圆角（避免转弯弧度太大）
                //     alwaysRespectStubs: true,
                //     // 新增：强制连线优先水平/垂直，减少交叉
                //     midpoint: 0.5,
                //     orientation: "horizontal" // 强制水平方向连线（适配左右锚点）
                // }],
                paintStyle: {
                    stroke: '#4a90e2',
                    strokeWidth: this.config.lineWidth,
                    radius: 0,
                    lineCap: 'round' // 线条末端圆润，配合水平箭头
                },
                hoverPaintStyle: {
                    stroke: '#3a7bc8',
                    strokeWidth: this.config.lineWidth + 1,
                },

                endpointStyle: {
                    fill: 'transparent',
                    stroke: 'transparent',
                    radius: 0,
                    width: 0,
                    height: 0
                },
                endpointHoverStyle: {
                    fill: 'transparent',
                    stroke: 'transparent',
                    radius: 0,
                    width: 0,
                    height: 0
                },
                // 保留原有：禁用交互
                isSource: false,
                isTarget: false,
                // 新增：确保连线渲染优先级，避免箭头方向错乱
                zIndex: 90
            });
        } catch (error) {
            console.error('Failed to create connection:', error);
            // 清理已创建的源点
            if (sourceElement.parentNode) {
                sourceElement.parentNode.removeChild(sourceElement);
            }
        }
    }

    /**
     * 创建源点元素
     */
    createSourcePoint(annotation) {
        const sourcePoint = document.createElement('div');
        sourcePoint.className = 'source-point'; // 添加类名以便统一管理
        sourcePoint.id = `source-${annotation.id}`;
        // 设置源点位置为原始点击位置
        sourcePoint.style.left = `${annotation.left - 3}px`;
        sourcePoint.style.top = `${annotation.top - 3}px`;
        sourcePoint.style.position = 'absolute';
        sourcePoint.style.width = '6px';
        sourcePoint.style.height = '6px';
        sourcePoint.style.opacity = '0'; // 隐藏源点

        return sourcePoint;
    }

    /**
     * 重新绘制所有连接
     */
    redrawConnections() {
        if (!this.jsPlumbInstance) return;

        // 清除所有连接
        this.jsPlumbInstance.deleteEveryEndpoint();

        // 重新连接每个标注，不再使用setTimeout
        this.annotations.forEach(annotation => {
            this.createConnection(annotation);
        });
    }

    /**
     * 渲染所有标注
     */
    renderAnnotations() {
        // 清空现有标注
        this.clearAnnotations();

        // 先进行分组平衡（优化版：考虑垂直分布）
        const { leftAnnotations, rightAnnotations } = this.balanceAnnotations();

        // 合并并标记分组信息
        const allAnnotations = [
            ...leftAnnotations.map(anno => ({ ...anno, _side: 'left' })),
            ...rightAnnotations.map(anno => ({ ...anno, _side: 'right' }))
        ];

        // 更新内部annotations数组，包含分组信息
        this.annotations = allAnnotations;

        // 渲染所有标注
        this.annotations.forEach(annotation => {
            this.renderAnnotation(annotation);
        });

        // 调整位置避免重叠（终极版：双层算法）
        this.adjustGroupPositions(leftAnnotations, rightAnnotations);
    }

    /**
     * 调整分组内标注位置，避免重叠
     */
    adjustGroupPositions(leftAnnotations, rightAnnotations) {
        this.adjustPositions(leftAnnotations, true);
        this.adjustPositions(rightAnnotations, false);
    }

    /**
     * 调整标注位置，避免重叠，同时尽量靠近标注点
     */
    arrangeAnnotations() {
        if (!this.annotations || this.annotations.length === 0) return;

        // 使用优化算法平衡两侧标注
        const { leftAnnotations, rightAnnotations } = this.balanceAnnotations();

        // 为两侧标注排序（按垂直位置），便于后续防重叠调整
        leftAnnotations.sort((a, b) => a.top - b.top);
        rightAnnotations.sort((a, b) => a.top - b.top);

        // 调整左侧标注位置
        this.adjustPositions(leftAnnotations, true);
        // 调整右侧标注位置
        this.adjustPositions(rightAnnotations, false);
    }

    /**
     * 平衡标注到两侧 - 优化版：不仅平衡数量，还考虑垂直分布密度
     * @returns {Object} 包含左侧和右侧标注数组的对象
     */
    balanceAnnotations() {
        const annotations = [...this.annotations];
        const n = annotations.length;
        if (n === 0) return { leftAnnotations: [], rightAnnotations: [] };
        if (n === 1) {
            const annotation = annotations[0];
            // 单个标注放在距离更近的一侧
            const distToLeftBoundary = Math.abs(annotation.left - this.config.leftBoundary);
            const distToRightBoundary = Math.abs(annotation.left - this.config.rightBoundary);
            if (distToLeftBoundary <= distToRightBoundary) {
                return { leftAnnotations: [annotation], rightAnnotations: [] };
            } else {
                return { leftAnnotations: [], rightAnnotations: [annotation] };
            }
        }

        // 按垂直位置排序，分为上下两半
        const sortedByY = [...annotations].sort((a, b) => a.top - b.top);
        const midIndex = Math.floor(n / 2);
        const topHalf = sortedByY.slice(0, midIndex);
        const bottomHalf = sortedByY.slice(midIndex);

        // 初始化左右标注数组
        const leftAnnotations = [];
        const rightAnnotations = [];

        // 上半部分优先分配到左侧，下半部分优先分配到右侧（减少垂直密度）
        topHalf.forEach(anno => {
            const distToLeft = Math.abs(anno.left - this.config.leftBoundary);
            const distToRight = Math.abs(anno.left - this.config.rightBoundary);
            if (distToLeft <= distToRight) leftAnnotations.push(anno);
            else rightAnnotations.push(anno);
        });

        bottomHalf.forEach(anno => {
            const distToLeft = Math.abs(anno.left - this.config.leftBoundary);
            const distToRight = Math.abs(anno.left - this.config.rightBoundary);
            if (distToLeft > distToRight) rightAnnotations.push(anno);
            else leftAnnotations.push(anno);
        });

        // 最后微调，确保数量平衡
        const targetLeftCount = Math.floor(n / 2);
        const targetRightCount = n - targetLeftCount;

        // 调整数量，确保平衡
        while (leftAnnotations.length > targetLeftCount) {
            rightAnnotations.push(leftAnnotations.pop());
        }
        while (rightAnnotations.length > targetRightCount) {
            leftAnnotations.push(rightAnnotations.pop());
        }

        return { leftAnnotations, rightAnnotations };
    }

    /**
     * 调整标注位置，避免重叠 - 终极版：力导向布局 + 强制无重叠贪心算法
     * @param {Array} annotations - 标注数组
     * @param {Boolean} isLeft - 是否为左侧标注
     */
    adjustPositions(annotations, isLeft) {
        if (!annotations || annotations.length === 0) return;

        const minSpacing = this.config.minSpacing;
        const containerHeight = this.container.offsetHeight;

        // 按原始垂直位置排序
        const sortedAnnotations = [...annotations].sort((a, b) => a.top - b.top);

        // 初始化每个标注的位置和尺寸（使用真实渲染尺寸）
        const positions = sortedAnnotations.map(annotation => {
            const element = document.getElementById(`annotation-${annotation.id}`);
            if (!element) return null;

            // 获取真实尺寸
            const rect = element.getBoundingClientRect();
            const actualHeight = rect.height;

            // 计算初始Y位置
            let y = parseInt(annotation.top - (actualHeight / 2));
            y = Math.max(0, Math.min(containerHeight - actualHeight, y));

            return {
                id: annotation.id,
                originalY: y,
                currentY: y,
                height: actualHeight,
                element: element
            };
        }).filter(Boolean); // 过滤掉null值

        if (positions.length === 0) return;

        // 第一层：力导向布局，让标注自动推开
        this.applyForceDirectedLayout(positions, minSpacing, containerHeight);

        // 第二层：强制无重叠贪心算法，从上到下遍历，确保绝对无重叠
        this.applyGreedyNonOverlapLayout(positions, minSpacing, containerHeight);

        // 应用最终位置到DOM元素
        positions.forEach(pos => {
            if (pos.element) {
                pos.element.style.top = `${pos.currentY}px`;
            }
        });
    }

    /**
     * 第一层：力导向布局算法
     */
    applyForceDirectedLayout(positions, minSpacing, containerHeight) {
        // 力导向布局迭代参数
        const maxIterations = 300;      // 增加迭代次数，确保充分收敛
        const stepSize = 0.4;           // 每次迭代移动步长
        const tolerance = 0.05;         // 收敛容忍度（更小的值，更严格）
        const repulsionFactor = 0.6;    // 排斥力系数（增大，推开更明显）
        const attractionFactor = 0.08;  // 吸引力系数（减小，更注重无重叠）

        // 力导向布局核心迭代
        for (let iter = 0; iter < maxIterations; iter++) {
            let totalMovement = 0;

            // 计算每个标注受到的力
            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                let force = 0;

                // 1. 计算与其他标注的排斥力
                for (let j = 0; j < positions.length; j++) {
                    if (i === j) continue;

                    const other = positions[j];
                    const distance = pos.currentY - other.currentY;
                    const minSafeDistance = (pos.height + other.height) / 2 + minSpacing;

                    // 如果距离小于安全距离，产生排斥力
                    if (Math.abs(distance) < minSafeDistance) {
                        const overlap = minSafeDistance - Math.abs(distance);
                        const repulsion = overlap * repulsionFactor;
                        force += distance > 0 ? repulsion : -repulsion;
                    }
                }

                // 2. 计算向原始位置的吸引力
                const attraction = (pos.originalY - pos.currentY) * attractionFactor;
                force += attraction;

                // 3. 更新位置并计算总移动量
                const newY = pos.currentY + force * stepSize;
                totalMovement += Math.abs(newY - pos.currentY);

                // 4. 限制在容器范围内
                pos.currentY = Math.max(0, Math.min(containerHeight - pos.height, newY));
            }

            // 检查是否收敛（移动量小于容忍度）
            if (totalMovement < tolerance) break;
        }
    }

    /**
     * 第二层：强制无重叠贪心算法，从上到下遍历，确保绝对无重叠
     */
    applyGreedyNonOverlapLayout(positions, minSpacing, containerHeight) {
        // 按当前Y位置重新排序
        const sortedPositions = [...positions].sort((a, b) => a.currentY - b.currentY);

        let lastBottom = -Infinity;

        for (let i = 0; i < sortedPositions.length; i++) {
            const pos = sortedPositions[i];

            // 强制当前标注的顶部必须在前一个标注的底部之下，加上间距
            const minTop = lastBottom + minSpacing;

            // 如果当前位置小于最小顶部，就移动到最小顶部
            if (pos.currentY < minTop) {
                pos.currentY = minTop;
            }

            // 更新最后一个标注的底部位置
            lastBottom = pos.currentY + pos.height;

            // 确保不超出容器底部
            if (pos.currentY + pos.height > containerHeight) {
                pos.currentY = containerHeight - pos.height;
                // 如果已经超出容器，后续标注也只能在底部堆叠
                lastBottom = containerHeight;
            }
        }

        // 从下到上再遍历一次，防止顶部空间浪费
        let firstTop = Infinity;
        for (let i = sortedPositions.length - 1; i >= 0; i--) {
            const pos = sortedPositions[i];
            const maxBottom = firstTop - minSpacing;
            const currentBottom = pos.currentY + pos.height;

            if (currentBottom > maxBottom) {
                pos.currentY = maxBottom - pos.height;
            }

            firstTop = pos.currentY;
        }
    }

    /**
     * 更新容器大小
     * @param {number} width - 新的宽度
     * @param {number} height - 新的高度
     */
    updateSize(width, height) {
        // 更新中心点
        this.centerX = width / 2;

        // 更新配置
        this.config = {
            ...this.config,
            minSpacing: Math.max(10, height * 0.01) // 根据容器高度调整间距
        };

        // 更新边界值
        this.updateBoundaries();

        // 重新渲染所有标注
        this.renderAnnotations();
    }

    /**
     * 销毁实例，清理资源
     */
    destroy() {
        // 清理jsPlumb实例
        if (this.jsPlumbInstance) {
            this.jsPlumbInstance.deleteEveryEndpoint();
            this.jsPlumbInstance.reset();
        }

        // 清理DOM元素
        this.clearAnnotations();

        // 移除临时测量元素
        if (this.tempDiv && this.tempDiv.parentNode) {
            this.tempDiv.parentNode.removeChild(this.tempDiv);
            this.tempDiv = null;
        }

        // 清空引用
        this.container = null;
        this.jsPlumbInstance = null;
        this.annotations = [];
    }
}
