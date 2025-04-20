// 全局变量，用于跟踪最高的z-index值
let highestZIndex = 1;
// 全局变量，用于跟踪按钮状态（true表示卡片已整理，false表示卡片已打乱）
let cardsArranged = false;

// 创建整理/打乱按钮
function createArrangeButton() {
    const button = document.createElement('button');
    button.id = 'arrange-button';
    button.className = 'arrange-button';
    button.textContent = '整理卡片';
    button.addEventListener('click', toggleCardsArrangement);
    document.body.appendChild(button);
}

// 切换卡片排列状态
function toggleCardsArrangement() {
    const button = document.getElementById('arrange-button');
    
    if (!cardsArranged) {
        // 如果卡片未整理，则整理卡片
        arrangeCards();
        button.textContent = '打乱卡片';
        cardsArranged = true;
    } else {
        // 如果卡片已整理，则打乱卡片
        shuffleCards();
        button.textContent = '整理卡片';
        cardsArranged = false;
    }
}

// 打乱卡片功能
function shuffleCards() {
    const cards = document.querySelectorAll('.card');
    
    // 禁用页面滚动
    document.body.style.overflow = 'hidden';
    
    cards.forEach(card => {
        // 先保存当前位置和旋转角度，以便从当前状态开始动画
        const currentLeft = card.offsetLeft;
        const currentTop = card.offsetTop;
        const currentRotation = getRotationDegrees(card);
        
        // 随机旋转角度 (-18° 到 18°)
        const rotation = Math.random() * 36 - 18;
        
        // 随机位置
        const left = 100 + Math.random() * (window.innerWidth - 400);
        const top = 100 + Math.random() * (window.innerHeight - 400);
        
        // 恢复原始宽度
        const dataIndex = Array.from(cards).indexOf(card);
        if (dataIndex < cardData.length) {
            const initialWidth = cardData[dataIndex].imageWidth || 300;
            card.style.width = `${initialWidth}px`;
            
            // 更新图片宽度
            const img = card.querySelector('.card-image');
            if (img && cardData[dataIndex].imageWidth) {
                img.setAttribute('width', cardData[dataIndex].imageWidth);
            }
        }
        
        // 强制浏览器重新计算布局
        void card.offsetHeight;
        
        // 添加完整的过渡效果，包括位置和旋转（使用非线性动画效果）
        card.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease-in-out, left 0.5s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)';
        
        // 应用新的样式，此时会触发动画
        card.style.transform = `rotate(${rotation}deg)`;
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        
        makeDraggable(card);
    });
}

// 辅助函数：获取元素的当前旋转角度
function getRotationDegrees(element) {
    const transform = window.getComputedStyle(element).getPropertyValue('transform');
    if (transform === 'none') return 0;
    
    const matrix = transform.match(/^matrix\((.+)\)$/);
    if (matrix) {
        const values = matrix[1].split(', ');
        const a = values[0];
        const b = values[1];
        const angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
        return (angle < 0) ? angle + 360 : angle;
    }
    return 0;
}

// 创建卡片元素
function createCards(data) {
    // 实现批次加载策略，每批次只显示少量卡片
    const batchSize = 3; // 每批次显示的卡片数量
    const batchDelay = 900; // 批次之间的延迟时间(ms)
    const minCardDelay = 800; // 同一批次内卡片最小延迟
    const maxCardDelay = 1400; // 同一批次内卡片最大延迟
    
    // 预先创建所有卡片元素，但不立即添加到DOM
    const cardElements = data.map((data, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // 随机旋转角度 (-18° 到 18°)
        const rotation = Math.random() * 36 - 18;
        card.style.transform = `rotate(${rotation}deg)`;
        
        // 随机位置
        const left = 100 + Math.random() * (window.innerWidth - 400);
        const top = 100 + Math.random() * (window.innerHeight - 400);
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        
        // 设置初始宽度，便于后续整理
        const initialWidth = data.imageWidth || 300;
        card.style.width = `${initialWidth}px`;
        
        // 卡片内容
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${data.title}</div>
                <div class="card-date">${data.date}</div>
            </div>
            <img class="card-image" src="${data.image}" alt="${data.title}" ${data.imageWidth ? `width="${data.imageWidth}"` : ''}>
        `;
        
        // 初始时隐藏卡片并设置初始缩放比例
        card.style.opacity = '0';
        card.style.visibility = 'hidden';
        card.style.transform = `rotate(${rotation}deg) scale(0.5)`; // 更小的初始比例，增强放大效果
        
        // 存储旋转角度，供后续使用
        card.dataset.rotation = rotation;
        
        return {
            element: card,
            index: index,
            loaded: false
        };
    });
    
    // 分批次加载卡片
    function loadBatch(batchIndex) {
        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min(startIdx + batchSize, cardElements.length);
        
        if (startIdx >= cardElements.length) {
            console.log('所有卡片批次加载完成');
            return;
        }
        
        // 加载当前批次的卡片
        for (let i = startIdx; i < endIdx; i++) {
            const cardObj = cardElements[i];
            const card = cardObj.element;
            
            // 获取图片元素并添加加载事件监听器
            const cardImage = card.querySelector('.card-image');
            
            // 为每张卡片设置加载函数
            const loadCard = function() {
                if (cardObj.loaded) return; // 避免重复加载
                cardObj.loaded = true;
                
                // 添加到DOM
                document.body.appendChild(card);
                
                // 添加拖拽功能
                makeDraggable(card);
                
                // 为每张卡片添加随机延迟，错开显示时间
                // 在同一批次内，卡片之间有更大的延迟差异
                const randomDelay = minCardDelay + Math.random() * (maxCardDelay - minCardDelay);
                
                // 显示卡片（添加放大淡入过渡效果）
                setTimeout(() => {
                    // 添加过渡效果，增加动画持续时间，确保transform和opacity的变化是平滑的
                    card.style.transition = 'opacity 1s ease-out, visibility 1s ease-out, transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    card.style.opacity = '1';
                    card.style.visibility = 'visible';
                    card.style.transform = `rotate(${card.dataset.rotation}deg) scale(1)`; // 从0.5缩放到1，产生更明显的放大效果
                    console.log(`卡片 ${cardObj.index + 1} 已显示，批次: ${batchIndex + 1}，延迟: ${randomDelay}ms`);
                }, randomDelay);
            };
            
            // 监听图片加载完成事件
            cardImage.onload = loadCard;
            
            // 如果图片已经缓存并加载完成，手动触发加载
            if (cardImage.complete) {
                loadCard();
            }
        }
        
        // 安排下一批次的加载
        setTimeout(() => {
            loadBatch(batchIndex + 1);
        }, batchDelay);
    }
    
    // 开始加载第一批卡片
    loadBatch(0);
}

// 实现拖拽功能
function makeDraggable(element) {
    // 避免重复输出日志
    if (!element.hasAttribute('data-draggable')) {
        console.log(`为元素添加拖拽功能`);
    }
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let initialTransform = '';
    let initialRotation = '';
    let currentTransition = '';
    
    // 添加鼠标悬停事件 - 只绑定一次
    if (!element.hasAttribute('data-hover')) {
        element.setAttribute('data-hover', 'true');
        
        element.addEventListener('mouseenter', () => {
            // 保存当前transform值，但移除可能已存在的特效
            initialTransform = element.style.transform
                .replace(/translateY\(-10px\)/g, '')
                .replace(/scale\([^)]+\)/g, '')
                .trim();
            
            // 根据卡片整理状态应用不同的悬停效果
            if (cardsArranged) {
                // 整理状态：轻微放大
                element.style.transform = `${initialTransform} scale(1.01)`;
            } else {
                // 打乱状态：上移效果
                element.style.transform = `${initialTransform} translateY(-10px)`;
            }
            
            element.style.boxShadow = '0 3px 6px rgba(255, 255, 255, 0.1)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = initialTransform;
            element.style.boxShadow = '0 2px 3px rgba(255, 255, 255, 0.1)';
        });
    }
    
    // 确保每个元素只绑定一次拖拽事件，避免重复绑定
    if (!element.hasAttribute('data-draggable')) {
        element.setAttribute('data-draggable', 'true');
        element.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // 保存当前旋转状态，移除所有特效
        initialRotation = element.style.transform
            .replace(/scale\([^)]+\)/g, '')
            .replace(/translateY\([^)]+\)/g, '')
            .trim();
        
        // 保存当前过渡效果，并临时移除位置相关的过渡效果
        const currentTransition = element.style.transition;
        element.style.transition = 'transform 0.3s ease-out, box-shadow 0.3s ease-in-out';
            
        // 添加拖拽时的缩放效果
        element.style.transform = `${initialRotation} scale(1.05)`;
        element.classList.add('dragging');
        element.style.zIndex = '1000';
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        // 只更新位置，不修改transform属性
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        
        element.classList.remove('dragging');
        // 恢复原始旋转状态，移除缩放效果，保留位置信息
        element.style.transform = initialRotation;
        
        // 恢复原始过渡效果
        element.style.transition = currentTransition;
        
        // 更新z-index使当前卡片位于最上层
        highestZIndex++;
        element.style.zIndex = highestZIndex;
    }
}

// 整理卡片功能
function arrangeCards() {
    const cards = document.querySelectorAll('.card');
    const cardWidth = 300; // 统一卡片宽度
    const margin = 20; // 卡片之间的间距
    const cardsPerRow = 4; // 每行显示4个卡片
    
    // 计算起始位置（居中显示）
    const totalWidth = (cardWidth + margin) * cardsPerRow - margin;
    const startX = (window.innerWidth - totalWidth) / 2;
    const startY = 100; // 距离顶部的距离
    
    // 首先应用统一宽度，以便正确计算高度
    cards.forEach(card => {
        card.style.transition = 'none'; // 暂时移除过渡效果以便立即应用宽度
        card.style.width = `${cardWidth}px`;
        
        // 更新图片宽度
        const img = card.querySelector('.card-image');
        if (img) {
            img.style.width = '100%';
            img.removeAttribute('width');
        }
    });
    
    // 强制浏览器重新计算布局
    void cards[0].offsetHeight;
    
    // 存储每列的底部位置
    const columnBottoms = Array(cardsPerRow).fill(startY);
    
    // 现在应用位置和其他样式
    cards.forEach((card, index) => {
        // 计算卡片在网格中的列位置
        const col = index % cardsPerRow;
        
        // 获取卡片的实际高度（包括边框和内边距）
        const cardHeight = card.offsetHeight;
        
        // 计算卡片的左侧位置
        const left = startX + col * (cardWidth + margin);
        
        // 设置卡片的顶部位置为当前列的底部位置
        const top = columnBottoms[col];
        
        // 更新当前列的底部位置（卡片顶部 + 卡片高度 + 间距）
        columnBottoms[col] = top + cardHeight + margin / 2;
        
        // 应用所有样式，包括过渡效果
        card.style.transition = 'all 0.5s ease-in-out';
        card.style.transform = 'rotate(0deg)';
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
    });
    document.body.style.overflow = 'auto';
}

// 页面加载完成后直接创建卡片和整理按钮
window.onload = function() {
    createCards(cardData);
    createArrangeButton();
};