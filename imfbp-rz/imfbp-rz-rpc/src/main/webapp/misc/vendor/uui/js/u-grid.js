;
(function($, window, document, undefined) {
	/*
	 * 对象所支持的属性及默认值
	 */
	var dataSource = function(options, gridComp) {
		this.defaults = {

		}
		this.gridComp = gridComp;
		this.options = $.extend({}, this.defaults, options);
		this.rows = new Array(); // 存储数据行
		this.hasParentRows = new Array(); // 存在父项
		this.nothasParentRows = new Array(); // 不存在父项
		this.sortRows();

	};
	var gridCompColumn = function(options, gridOptions) {
		this.defaults = {
				width:200, // 默认宽度为200
				sortable: true, // 是否可以排序
				canDrag: true, // 是否可以拖动
				fixed: false, // 是否固定列
				visible: true, // 是否显示
				canVisible: true, // 是否可以隐藏
				sumCol:false, // 是否计算合计
				editable:true, // 是否可修改
				editFormShow:true, // 是否可修改
				autoExpand:false, // 是否自动扩展列
				editType:'text', // 编辑类型，支持传入function扩展
				dataType:'String', // 数据类型,string, date, datetime, integer, float
				//precision:  //精度
				format:'yyyy-MM-dd hh:mm:ss',
				//renderType:'', 渲染类型
				//headerColor
				headerLevel:1, // header层级
				hiddenLevel:1 // 宽度不足隐藏的优先级，值越大优先隐藏
				// parentHeader 对应的父header的title
				// 目前仅支持两级，多级的话需要改变头的高度，另外处理当前级别的时候需要看下是否存在上级，如果存在上级的话
				// 则创建新的div，这就涉及到需要躲变量计算每级的宽度，需要考虑下如何实现。
		};
			// 从grid继承的属性
		var gridDefault = {
			sortable: gridOptions.sortable,
			canDrag: gridOptions.canDrag,
//			editable: gridOptions.editable,
			width: gridOptions.columnWidth
		};
		if(options.dataType == 'Date'){
			this.defaults.format = 'yyyy-MM-dd';
		}
		// 树表暂时不支持排序
		if(gridOptions.showTree){
			options.sortable = false;
		}
		this.options = $.extend({}, this.defaults, gridDefault, options);

		// 转成数字
		this.options.width = parseInt(this.options.width);

		this.firstColumn = false;
	};

	var gridComp = function(ele, options) {
		this.dataSource = dataSource;
		this.gridCompColumn = gridCompColumn;
		this.ele = ele[0];
		this.$ele = ele;

		this.defaults = {
			id: 'grid',
			//width: '100%',
			//height: '100%',
			columnWidth:200,
			sortable: true, // 是否可以排序
			canDrag: true, // 是否可以拖动
			canSwap: true, // 是否可以交换列位置
			showHeader: true, // 是否显示表头
			columnMenu: true, // 是否存在列头操作按钮
			showNumCol: false, // 是否显示数字列
			multiSelect:false, // 是否显示复选框
			showSumRow: false, // 是否显示合计行
			editable: false, // 是否可修改
			noneEditableFormShow:true,// form编辑器是否显示不可编辑字段
			editType: 'default', // 编辑方式，default为行编辑，form为在行下方以form编辑
			showTree:false, // 是否显示树表
			autoExpand:true, // 是否默认展开
			cancelFocus:false, // 第二次点击是否取消focus
			maxHeaderLevel:1, // header的最高层级，用于计算header区域的高度
			overWidthHiddenColumn:false, // 宽度不足时是否自动隐藏column
			formMaxWidth:300 // 整体宽度小于某一值之后以form展示
		}

		this.transDefault = {
			ml_show_column:trans('gridComp.show_column', '显示/隐藏列'),
			ml_clear_set:trans('gridComp.clear_set', '清除设置'),
			ml_no_rows:trans('gridComp.no_rows', '无数据'),
			ml_sum:trans('gridComp.sum', '合计:'),
			ml_close:trans('gridComp.close', '关闭')
		}

		this.transMap = $.extend({},this.transDefault,options.transMap);

		if(options.maxHeaderLevel > 1){
			options.canSwap = false;
		}

		this.options = $.extend({}, this.defaults, options);
		if(this.options.showTree){
			this.options.showNumCol = false;
		}
		this.gridCompColumnArr = new Array(); // 存储设置默认值之后的columns对象
		this.gridCompColumnFixedArr = new Array(); // 存储设置默认值之后的固定列columns对象
		this.basicGridCompColumnArr = new Array(); // 存储基本的columns对象，用于清除设置
		this.gridCompLevelColumn = new Array(); // 存储多级表头时的多级
		this.gridCompHiddenLevelColumnArr = new Array(); // 存储自动隐藏时隐藏优先级排序后的column

		this.treeLeft = 10; // 树表时每一级之间的差值
		this.multiSelectWidth = 40; // 复选框列宽度
		this.numWidth = 40; // 数字列宽度
		this.multiWidth = 40; // 复选框宽度
		this.headerHeight = 34; // header区域高度
		this.headerHeight = 34 * parseInt(this.options.maxHeaderLevel);
		this.countContentHeight = true;// 是否计算内容区的高度（是否为流式）
		this.minColumnWidth = 80; // 最小列宽
		this.columnMenuWidth = 160; // column menu的宽度
		this.scrollBarHeight = 16; // 滚动条高度
		this.columnMenuHeight = 33;

		this.initGrid();
	};

	/*
	 * 对象提供的方法
	 */
	gridComp.prototype = {
		/*
		 * 创建grid
		 */
		initGrid: function() {
			var oThis = this;
			this.initOptions();
			this.initVariable();
			this.initWidthVariable();
			this.initGridCompColumn();
			this.initDataSource();
			this.createDivs();
			// UAP-NC 轻量化项目：切换tab时添加form会消失问题
			this.inte = setInterval(function(){oThis.setIntervalFun.call(oThis)}, 300);
		},

		destroySelf: function(){
			clearInterval(this.inte);
			this.$ele.data('gridComp',null);
			this.ele.innerHTML = '';
		},

		/*
		 * 对传入参数进行格式化处理
		 * 宽度、高度处理
		 * 左侧区域宽度计算
		 * 除去内容区域的高度
		 */
		initOptions: function() {
			this.options.width = this.formatWidth(this.options.width);
			this.options.height = this.formatWidth(this.options.height);
			if(this.options.height == '100%' || !this.options.height){
				this.countContentHeight = false;
			}

			this.leftW = 0; // 左侧区域宽度（数字列复选框等）
			if (this.options.showNumCol) {
				this.leftW += this.numWidth;
			}
			if(this.options.multiSelect){
				this.leftW += this.multiWidth;
			}

			this.exceptContentHeight = 0; // 内容区域之外的高度
			if(this.options.showHeader){
				this.exceptContentHeight +=this.headerHeight;
			}

			// 缓存id
			var url = window.location.href;
			var index = url.indexOf('?');
			if(index > 0){
				url = url.substring(0,index);
			}
			this.localStorageId = this.options.id + url;

		},

		/*
		 * 初始化变量
		 */
		initVariable:function(){
			this.initDataSourceVariable();
			// 鼠标点击移动时位置记录
			this.mouseUpX = 'mouseUpX';
			this.mouseUpY = 'mouseUpY';
			this.mouseDownX = 'mouseDownX';
			this.mouseDownY = 'mouseDownY';
			this.mouseMoveX = 'mouseMoveX';
			this.mouseMoveY = 'mouseMoveY';
			this.scrollLeft = 0; // 记录横向滚动条
			this.scrollTop = 0;// 记录纵向滚动条
			this.showType = ''; // 记录grid显示方式，form和grid
			this.createGridFlag = false; // 是否已经创建grid展示
			this.createFormFlag = false; // 是否已经创建form展示
			this.columnClickX = 0; // 点击处的X坐标
			this.columnClickY = 0; // 点击处的Y坐标
			this.$sd_storageData = null;// 本地缓存内容为object
			this.columnMenuMove = false;// 是否在column menu区域移动
			this.createColumnMenuFlage = false;
			this.firstColumn = true; // 用于记录是否已经存在第一列，true表示还没有，false表示已经存在
			this.lastVisibleColumn = null;
			this.lastVisibleColumnWidth = 0;
			this.menuColumnsHeight = 0;
		},
		/*
		 * 初始化datasource相关变量
		 */
		initDataSourceVariable:function(){
			this.selectRows = new Array();
			this.selectRowsObj = new Array();
			this.selectRowsIndex = new Array();
			this.allRows = new Array();
			this.eidtRowIndex = -1; // 当前修改行
		},

		// 初始化宽度相关变量
		initWidthVariable:function(){
			// 计算用变量
			this.wholeWidth = 0; // 整体宽度
			this.wholeHeight = 0; // 整体高度
			this.rowHeight = 0; // 数据行高度
			this.fixedRealWidth = 0; // 固定区域真实宽度
			this.fixedWidth = 0; // 固定区域宽度
			this.contentRealWidth = 0; // 内容区真实宽度,严格按照设置的width计算的宽度
			this.contentWidth = 0; // 内容区宽度，自动扩展之后的宽度
			this.contentMinWidth = 0; // 内容区最小宽度,即可视宽度
			this.contentHeight = 0; //内容区高度
		},
		/*
		 * 创建gridCompColumn对象方便后续处理
		 */
		initGridCompColumn: function() {
			var oThis = this;
			oThis.gridCompColumnFixedArr = new Array();
			oThis.gridCompHiddenLevelColumnArr = new Array();
			if (this.options.columns) {
				$.each(this.options.columns, function(i) {
					if(!(this.headerLevel > 1)){
						var column = new gridCompColumn(this, oThis.options);
						column.options.realWidth = column.options.width;
						oThis.gridCompColumnArr.push(column);
						var column1 = new gridCompColumn(this, oThis.options);
						column1.options.realWidth = column1.options.width;
						oThis.basicGridCompColumnArr.push(column1);
					}else{
						oThis.gridCompLevelColumn.push(this);
					}
				});
			}
			var localGridCompColumnArr = this.getGridCompColumnArrFromLocal();
			// 获取本地缓存中的数据
			if(localGridCompColumnArr != null){
				this.gridCompColumnArr = localGridCompColumnArr;
				$.each(this.gridCompColumnArr,function(){
					var field = this.options.field;
					for(var i =0;i < oThis.options.columns.length;i++){
						var c = oThis.options.columns[i];
						if(c.field == field){
							var options = $.extend({},c,this.options);
							this.options = options;
							this.options.realWidth = this.options.width;
							break;
						}
					}
				});
			}
			this.menuColumnsHeight = this.gridCompColumnArr.length * this.columnMenuHeight;
			
			
			this.initGridHiddenLevelColumn();
			this.initGridCompFixedColumn();
			this.columnsVisibleFun();
		},

		setRequired: function(field, value){
			var oThis = this;
			$.each(this.gridCompColumnArr,function(i){
				if(this.options.field == field){
					this.options.required = value;
					if(!value) {
						$('#' + oThis.options.id +  '_edit_' + this.options.field).parent().find('.u-grid-edit-mustFlag').hide()
					} else {
						$('#' + oThis.options.id +  '_edit_' + this.options.field).parent().find('.u-grid-edit-mustFlag').show()
					}


				}
			});


		},

		getLevelTitleByField:function(field){
			for(var i = 0; i < this.gridCompLevelColumn.length; i++){
				var columnField = this.gridCompLevelColumn[i].field;
				if(columnField == field){
					return this.gridCompLevelColumn[i].title;
				}
			}
			return '';
		},
		
		/*
		 * 按照hiddenLevel对column进行排序
		 */
		initGridHiddenLevelColumn:function(){
			if(!this.options.overWidthHiddenColumn)
				return;
			var oThis = this;
			var w = 0;
			
			this.gridCompHiddenLevelColumnArr = this.gridCompColumnArr.slice(0);
			
			this.gridCompHiddenLevelColumnArr.sort(function(a, b) {
				var hiddenLevel1 = a.options.hiddenLevel;
				var hiddenLevel2 = b.options.hiddenLevel;
				if(hiddenLevel1 > hiddenLevel2){
					return -1;
				}else{
					return 1;
				}
			});
		},

		/*
		 * 将固定列放入gridCompColumnFixedArr
		 */
		initGridCompFixedColumn:function(){
			var oThis = this;
			var w = 0;
			$.each(this.gridCompColumnArr,function(i){
				if(this.options.fixed == true){
					oThis.gridCompColumnFixedArr.push(this);
				}
			});
			$.each(this.gridCompColumnFixedArr,function(i){
				for(var i = oThis.gridCompColumnArr.length;i >-1;i-- ){
					if(oThis.gridCompColumnArr[i] == this){
						oThis.gridCompColumnArr.splice(i,1);
						break;
					}
				}
			});
		},
		/*
		 * 创建dataSource对象方便后续处理
		 */
		initDataSource: function() {
			var oThis = this;
			this.dataSourceObj = new dataSource(this.options.dataSource,this);
		},

		/*
		 * 创建顶层div以及_top div层
		 * 添加顶层div相关监听
		 */
		createDivs: function() {
			var oThis = this;
			this.ele.innerHTML = '';
			// 创建顶层div
			var styleStr = '',str = '';
			if(this.options.width){
				str += 'width:' + this.options.width + ';';
			}else{
				str += 'width:auto;';
			}
			if(this.options.height){
				str += 'height:' + this.options.height + ';';
			}else{
				str += 'height:auto;';
			}
			if(str != ''){
				styleStr = 'style="' + str + '"';
			}
			var htmlStr = '<div id="' + this.options.id + '" data-role="grid" class="u-grid" ' + styleStr + '>';
			htmlStr += '</div>';
			this.ele.insertAdjacentHTML('afterBegin', htmlStr);
			// 创建屏幕div,用于拖动等操作
			var htmlStr = '<div id="' + this.options.id + '_top" class="u-grid-top"></div>';
			this.ele.insertAdjacentHTML('afterBegin', htmlStr);

			this.initEventFun(); //创建完成之后顶层div添加监听
			this.widthChangeFun(); // 根据整体宽度创建grid或form展示区域
		},
		/*
		 * 创建div区域
		 */
		repaintDivs:function(){
			// 后期可以考虑form展示
			this.repaintGridDivs();
			this.realtimeTableRows = null;
		},		/*
		 * 创建grid形式下div区域
		 */
		createGridDivs: function() {
			if (this.createGridFlag) {
				return;
			}
			// 为避免重复渲染，在开始清空里面内容
			if($('#' + this.options.id)[0])
				$('#' + this.options.id)[0].innerHTML = '';
			var htmlStr = '<div id="' + this.options.id + '_grid" class="u-grid-grid">';
//			if(this.options.showHeader){//由于可以动态修改showHeader，所以提前创建
				htmlStr += this.createColumnMenu();
				htmlStr += this.createHeader();
//			}
			htmlStr += this.createContent();
//			if(this.options.editable){ //由于可以动态修改editable，所以提前创建
//				htmlStr += this.createContentEditMenu();
//			}
			htmlStr += '</div>';
			if($('#' + this.options.id)[0])
				//$('#' + this.options.id)[0].insertAdjacentHTML('afterBegin', htmlStr);
				$('#' + this.options.id).html(htmlStr);

			this.headerFirstClassFun();
			this.initGridEventFun();
			this.showType = 'grid';
			this.afterGridDivsCreate();
			this.createGridFlag = true;
			this.realtimeTableRows = null;
		},
		/*
		 * 重画grid
		 */
		repaintGridDivs: function() {
			$('#' + this.options.id + '_grid').remove(null, true);
			this.showType = '';
			this.wholeWidth = 0;
			this.createGridFlag = false;
			this.columnsVisibleFun();
			this.widthChangeFun();
			this.realtimeTableRows = null;
		},

		/*
		 * 创建columnMenu区域
		 */
		createColumnMenu: function() {
			var oThis = this;
			var htmlStr = '<div class="u-grid-column-menu" id="' + this.options.id + '_column_menu">';
			htmlStr += '<ul data-role="menu" role="menubar" class="u-grid-column-menu-ul" id="' + this.options.id + '_column_menu_ul">';

			// 创建显示/隐藏列
			htmlStr += '<li class="u-grid-column-menu-li" role="menuitem">';
			htmlStr += '<div class="u-grid-column-menu-div1" id="' + this.options.id + '_showColumn">';
			htmlStr += '<span class="u-grid-column-menu-span">' + this.transMap.ml_show_column + '</span>';
			htmlStr += '<div class="u-grid-column-menu-div3 fa fa-caret-right"></div>';
			htmlStr += '</div></li>';

			// 创建清除设置
			htmlStr += '<li class="u-grid-column-menu-li" role="menuitem">';
			htmlStr += '<div class="u-grid-column-menu-div1" id="' + this.options.id + '_clearSet">';
			htmlStr += '<span class="u-grid-column-menu-span">' + this.transMap.ml_clear_set + '</span>';
			htmlStr += '</div></li>';

			htmlStr += '</ul></div>';

			// 创建数据列区域
			htmlStr += '<div class="u-grid-column-menu-columns" id="' + this.options.id + '_column_menu_columns">';
			htmlStr += '<ul data-role="menu" role="menubar" class="u-grid-column-menu-columns-ul" id="' + this.options.id + '_column_menu_columns_ul">';
			$.each(this.gridCompColumnArr, function(i) {
				if(oThis.getString(this.options.title,'') != ''){
					htmlStr += '<li class="u-grid-column-menu-columns-li" role="menuitem" index="' + i + '">';
					htmlStr += '<div class="u-grid-column-menu-columns-div1">';
					var checkedStr = "";
					if(this.options.visible)
						checkedStr = ' checked';
					if(!this.options.canVisible)
						checkedStr += ' style="display:none;"';
					htmlStr += '<div class="u-grid-column-menu-columns-div2"><input type="checkbox" ' + checkedStr + '></div>';
					htmlStr += '<span class="u-grid-column-menu-columns-span">' + this.options.title + '</span>';
					htmlStr += '</div></li>';
				}
			});
			htmlStr += '</ul></div>';
			return htmlStr;
		},

		/*
		 * 创建header区域
		 */
		createHeader: function() {
			var wrapStr = ''
			if(this.wholeWidth > 0){
//				wrapStr = 'style="max-width:' + this.wholeWidth + 'px;"'
			}
			var headerShowStr = '';
			if(!this.options.showHeader)
				headerShowStr = 'style="display:none;"';
			var htmlStr = '<div class="u-grid-header" id="' + this.options.id + '_header" ' + headerShowStr + '><div class="u-grid-header-wrap" id="' + this.options.id + '_header_wrap" data-role="resizable" ' + wrapStr + '>';
			if (this.options.multiSelect || this.options.showNumCol) {
				htmlStr += '<div id="' + this.options.id + '_header_left" class="u-grid-header-left" style="width:' + this.leftW + 'px;">';
				if (this.options.multiSelect) {
					if(iweb.browser.isIE8){
						htmlStr += '<div class="u-grid-header-multi-select" style="width:' + this.multiWidth + 'px;"><input class="u-grid-multi-input"   type="checkbox" id="' + this.options.id + '_header_multi_input"></div>'
					}else{
						htmlStr += '<div class="u-grid-header-multi-select  checkbox check-success" style="width:' + this.multiWidth + 'px;"><input  class="u-grid-multi-input"  type="checkbox" id="' + this.options.id + '_header_multi_input"><label for="' + this.options.id + '_header_multi_input"></label></div>'
					}
				}
				if (this.options.showNumCol) {
					htmlStr += '<div class="u-grid-header-num" style="width:' + this.numWidth + 'px;"></div>';
				}
				htmlStr += '</div>';
			}
			htmlStr += this.createHeaderTable('fixed');
			htmlStr += this.createHeaderTable();
			htmlStr += '</div>';
			htmlStr += '<div class="u-grid-header-resize-handle" id="' + this.options.id + '_resize_handle"><div class="u-grid-header-resize-handle-inner"></div></div>';
			htmlStr += '</div>';
			return htmlStr;
		},
		/*
		 * 创建header区域table
		 */
		createHeaderTable:function(createFlag){
			var leftW,positionStr,idStr;
			if(createFlag == 'fixed'){
				leftW = parseInt(this.leftW);
				positionStr = 'absolute;width:'+this.fixedWidth+'px;z-index:11;background:#F9F9F9;';
				idStr = 'fixed_';
			}else{
				leftW = parseInt(this.leftW) + parseInt(this.fixedWidth);
				positionStr = 'relative;';
				idStr = '';
				if(this.contentMinWidth > 0){
					positionStr += 'width:'+this.contentMinWidth+'px;';
				}
			}

			var htmlStr = '<table role="grid" id="' + this.options.id + '_header_'+idStr+'table" style="position:'+ positionStr+';left:' + leftW + 'px">';
			htmlStr += this.createColgroup(createFlag);
			htmlStr += '<thead role="rowgroup" id="' + this.options.id + '_header_'+idStr+'thead">';
			htmlStr += this.createThead(createFlag);
			htmlStr += '</thead></table>';
			return htmlStr;
		},
		/*
		 * 创建colgroup
		 */
		createColgroup: function(createFlag) {
			var oThis = this,
				htmlStr = '<colgroup>',gridCompColumnArr;
			if(createFlag == 'fixed'){
				gridCompColumnArr = this.gridCompColumnFixedArr;
			}else{
				gridCompColumnArr = this.gridCompColumnArr;
			}
			$.each(gridCompColumnArr, function() {
				if(this.options.visible){
					htmlStr += '<col';
					htmlStr += ' style="width:' + oThis.formatWidth(this.options.width) + '"';
					htmlStr += '>';
				}
			});
			htmlStr += '</colgroup>';
			return htmlStr;
		},

		/*
		 * 创建thead区域
		 */
		createThead: function(createFlag) {
			var oThis = this;
			var visibleIndex = 0;
			var gridCompColumnArr;

			var trStyle = '';
			if(this.options.maxHeaderLevel >1){
				trStyle = 'style="height:' + this.headerHeight + 'px;"';
			}

			var htmlStr = '<tr role="row" ' + trStyle + '>';
			if(createFlag == 'fixed'){
				gridCompColumnArr = this.gridCompColumnFixedArr;
			}else{
				gridCompColumnArr = this.gridCompColumnArr;
			}
			$.each(gridCompColumnArr, function(i) {
				var vi = visibleIndex;
				var displayStyle = '';
				if(this.options.visible == false){
					vi = -1;
					displayStyle = 'style="display:none;"';
				}else{
					visibleIndex++;
				}
				// 低版本浏览器不支持th position为relative，因此加入空div
				htmlStr += '<th role="columnheader" data-filed="' + this.options.field + '" rowspan="1" class="u-grid-header-th" ' + displayStyle + 'field="' + this.options.field + '" index="' + i + '" visibleIndex="' + vi + '"><div style="position:relative;">';
				var colorStype = '';
				if(this.options.headerColor){
					colorStype = 'style="color:' + this.options.headerColor + '"';
				}
				htmlStr += '<div class="u-grid-header-link" field="' + this.options.field + '" title="' + this.options.title + '" ' + colorStype + '>' + this.options.title + '</div>';
				if(oThis.options.columnMenu && createFlag != 'fixed'){
					// 创建右侧按钮图标
					htmlStr += '<div class="u-grid-header-columnmenu fa fa-bars " field="' + this.options.field + '" style="display:none;"></div>';
				}
				htmlStr += '</div></th>';
			});
			htmlStr += '</tr>';

			return htmlStr;
		},		/*
		 * 创建内容区域
		 */
		createContent: function() {
			var h = '',displayStr = '',bottonStr='';
			if(this.countContentHeight){
				var wh = $('#' + this.options.id)[0].offsetHeight;
				this.wholeHeight = wh;
				if (wh > 0) {
					this.contentHeight = parseInt(wh) - this.exceptContentHeight > 0?parseInt(wh) - this.exceptContentHeight:0;
					if(this.contentHeight > 0){
						h = 'style="max-height:' + this.contentHeight + 'px;"';
					}
				}
			}
			var htmlStr = '<div id="' + this.options.id + '_content" class="u-grid-content" ' + h + '>';
			if (this.options.showNumCol || this.options.multiSelect) {
				htmlStr += this.createContentLeft();
				if(!(this.contentWidth > this.contentMinWidth)){
					displayStr = 'display:none;';
					bottonStr = 'bottom:0px;'
				}
				if(this.options.showSumRow){
					htmlStr += '<div class="u-grid-content-left-sum-bottom" id="' + this.options.id + '_content_left_sum_bottom" style="width:' + (this.leftW + this.fixedWidth) + 'px;'+bottonStr+'">';
					htmlStr += '</div>';
				}
				if(u.isIOS){
					displayStr += 'width:0px;';
				}
				htmlStr += '<div class="u-grid-content-left-bottom" id="' + this.options.id + '_content_left_bottom" style="width:' + (this.leftW + this.fixedWidth) + 'px;'+displayStr+'">';
				htmlStr += '</div>';
			}
			htmlStr += this.createContentTable('fixed');
			htmlStr += this.createContentTable();
			htmlStr += '</div>';
			return htmlStr;
		},

		/*
		 * 创建内容区左侧区域
		 */
		createContentLeft: function() {
			var oThis = this,
				htmlStr = "",
				left = 0;
			if(this.options.multiSelect){
				htmlStr += '<div class="u-grid-content-left" id="' + this.options.id + '_content_multiSelect" style="width:' + this.multiSelectWidth + 'px;">';
				// 遍历生成所有行
				if (this.dataSourceObj.rows) {
					$.each(this.dataSourceObj.rows, function(i) {
						htmlStr += oThis.createContentLeftMultiSelectRow(this);
					});
				}
				htmlStr += '</div>';
				left += this.multiSelectWidth;
			}
			if (this.options.showNumCol) {
				htmlStr += '<div class="u-grid-content-left" id="' + this.options.id + '_content_numCol" style="width:' + this.numWidth + 'px;left:' + left + 'px;">';
				// 遍历生成所有行
				if (this.dataSourceObj.rows) {
					$.each(this.dataSourceObj.rows, function(i) {
						htmlStr += oThis.createContentLeftNumColRow(i);
					});
				}
				htmlStr += '</div>';
			}

			return htmlStr;
		},

		/*
		 * 创建内容区左侧区域复选区（一行）
		 */
		createContentLeftMultiSelectRow:function(row,displayFlag){
			var displayStr = '';
			if(!this.options.autoExpand && row.level > 0 && displayFlag != 'block'){
				displayStr = 'display:none;'
			}
			var tmpcheck = row.value["$_#_@_id"]
			if(!tmpcheck) {
				tmpcheck = setTimeout(function(){});
			}

			if(iweb.browser.isIE8){
				var	htmlStr = '<div style="width:' + this.multiSelectWidth + 'px;' + displayStr + '" class="u-grid-content-multiSelect " ><input class="u-grid-multi-input" id="checkbox'+tmpcheck+'" type="checkbox" value="1" ></div>'
			}else{
				var htmlStr = '<div style="width:' + this.multiSelectWidth + 'px;' + displayStr + '" class="u-grid-content-multiSelect checkbox check-success" ><input class="u-grid-multi-input" id="checkbox'+tmpcheck+'" type="checkbox" value="1" ><label for="checkbox'+tmpcheck+'"></label></div>'
			}
			return htmlStr;
		},
		/*
		 * 创建内容区左侧区域数字列（一行）
		 */
		createContentLeftNumColRow:function(index){
			var htmlStr = '<div style="width:' + this.numWidth + 'px;" class="u-grid-content-num">' + (index+1) + '</div>';
			return htmlStr;
		},



		/*
		 * 创建内容区table
		 */
		createContentTable:function(createFlag){
			var leftW,idStr,styleStr,hStr,cssStr,tableStyleStr;
			if(this.countContentHeight && parseInt(this.contentHeight) > 0){
				hStr = 'max-height:' + this.contentHeight + 'px;';
			}else{
				hStr = "";
			}
			if(createFlag == 'fixed'){
				leftW = parseInt(this.leftW);
				idStr = 'fixed_';
				cssStr = 'fixed-';
				styleStr = 'style="position:absolute;width:'+this.fixedWidth+'px;left:' + leftW + 'px;' +hStr+'"';
				tableStyleStr = 'style="width:'+this.fixedWidth+'px;"';
			}else{
				leftW = parseInt(this.leftW) + parseInt(this.fixedWidth);
				idStr = '';
				cssStr = '';
				styleStr = 'style="position:relative;left:' + leftW + 'px;' +hStr;
				if(this.contentMinWidth > 0){
					styleStr += 'width:' + this.contentMinWidth + 'px;';
				}
				styleStr += '"';
				tableStyleStr = '';
				if(this.contentMinWidth > 0){
					if(this.contentWidth > 0){
						tableStyleStr = 'style="min-width:' + this.contentMinWidth + 'px;width:' + this.contentWidth + 'px;"';
					}else{
						tableStyleStr = 'style="min-width:' + this.contentMinWidth + 'px;"';
					}
				}
			}
			var  htmlStr = '<div id="' + this.options.id + '_content_'+idStr+'div" class="u-grid-content-'+cssStr+'div" '+styleStr+'>';
			htmlStr += '<div style="height:30px;position:absolute;top:-30px;width:100%;"></div><table role="grid" id="' + this.options.id + '_content_'+idStr+'table" ' + tableStyleStr+'>';
			htmlStr += this.createColgroup(createFlag);
			htmlStr += '<thead role="rowgroup" id="' + this.options.id + '_content_'+idStr+'thead" style="display:none">';
			htmlStr += this.createThead(createFlag);
			htmlStr += '</thead>';
			htmlStr += this.createContentRows(createFlag);
			htmlStr += '</table>';
			if(createFlag != 'fixed'){
				htmlStr += this.createNoRowsDiv();
			}
			htmlStr += '</div>';
			return htmlStr;
		},

		/*
		 * 创建无数据区域
		 */
		createNoRowsDiv:function(){
			var styleStr = '',styleStr1 = '';
			if(this.contentMinWidth > 0){
				styleStr += 'style="width:' + this.contentMinWidth + 'px;"';
			}
			if(this.contentWidth > 0){
				styleStr1 += 'style="width:' + this.contentWidth + 'px;"';
			}

			var htmlStr = '<div class="u-grid-noRowsDiv"' + styleStr1 + ' id="' + this.options.id + '_noRows"></div>';
			htmlStr += '<div class="u-grid-noRowsShowDiv"' + styleStr + ' id="' + this.options.id + '_noRowsShow">' + this.transMap.ml_no_rows + '</div>';

			return htmlStr;
		},


		/*
		 * 创建内容区域所有行
		 */
		createContentRows: function(createFlag) {
			var oThis = this,
				htmlStr = "",idStr;
			if(createFlag == 'fixed'){
				idStr = 'fixed_';
			}else{
				idStr = '';
			}
			// 遍历生成所有行
			if (this.dataSourceObj.rows) {
				htmlStr += '<tbody role="rowgroup" id="' + this.options.id + '_content_'+idStr+'tbody">';
				$.each(this.dataSourceObj.rows, function(i) {
					htmlStr += oThis.createContentOneRow(this,createFlag);
				});
				if(oThis.options.showSumRow && this.dataSourceObj.rows && this.dataSourceObj.rows.length > 0){
					htmlStr += oThis.createSumRow(createFlag);
				}
				htmlStr += '</tbody>';
			}
			return htmlStr;
		},

		/*
		 * 创建内容区域数据行
		 */
		createContentOneRow: function(row,createFlag,displayFlag) {
			var styleStr = '';
			if(!this.options.autoExpand && row.level > 0 && displayFlag != 'block'){
				styleStr = 'style="display:none"';
			}
			var htmlStr = '<tr role="row" ' + styleStr + '>';
			htmlStr += this.createContentOneRowTd(row,createFlag);
			htmlStr += '</tr>';
			return htmlStr;
		},
		/*
		 * 创建内容区域数据行，针对IE
		 */
		createContentOneRowForIE:function(table,index,rowObj,createFlag,displayFlag){
			var row = table.insertRow(index + 1);
			//row.role = 'row';
			row.setAttribute("role","row");
			if(!this.options.autoExpand && row.level > 0 && displayFlag != 'block'){
				row.style.display = 'none';
			}
			this.createContentOneRowTdForIE(row,rowObj,createFlag);

		},

		/*
		 * 数据更新重画当前行
		 */
//		repaintRow:function(tr,row,createFlag){
		repaintRow:function(rowIndex){
			var tr = $('#' + this.options.id + '_content_tbody').find('tr[role="row"]')[ rowIndex];
			var fixedtr = $('#' + this.options.id + '_content_fixed_tbody').find('tr[role="row"]')[rowIndex];
			var row = this.dataSourceObj.rows[rowIndex];
			var $tr = $(tr);
			var index = this.getTrIndex($tr);
			if(iweb.browser.isIE8 || iweb.browser.isIE9){
				var table = $('#' + this.options.id + '_content_table')[0];
				var fixedtable = $('#' + this.options.id + '_content_fixed_table')[0];
				//table.deleteRow(this.eidtRowIndex + 1);
				//fixedtable.deleteRow(this.eidtRowIndex + 1);
				this.createContentOneRowTdForIE(tr,row)
				this.createContentOneRowTdForIE(fixedtr,row,'fixed')


			}else{
				tr.innerHTML = this.createContentOneRowTd(row);
				fixedtr.innerHTML = this.createContentOneRowTd(row,'fixed');
			}
			var obj = {};
			obj.begin = index;
			obj.length = 1;
//			obj.createFlag = createFlag;
			this.renderTypeFun(obj);
		},

		/*
		 * 创建行td对应的html
		 */
		createContentOneRowTd:function(row,createFlag){
			var oThis = this;
			var htmlStr = '',gridCompColumnArr;
			if(createFlag == 'fixed'){
				gridCompColumnArr = this.gridCompColumnFixedArr;
			}else{
				gridCompColumnArr = this.gridCompColumnArr;
			}
			var value = row.value;
			$.each(gridCompColumnArr, function() {
				var f = this.options.field,
					v = $(value).attr(f);
					v = oThis.getString(v,'');
				// tianxq begin
				if($.type(v) == 'object') {
					v = v.showValue
				}
				// tianxq end
				var renderType = this.options.renderType;
				var treeStyle = '';
				var spanStr ='';
				var iconStr = '';
				var vStr= '';
				var tdStyle = '';

				if(oThis.options.showTree && this.firstColumn){
					var l = parseInt(oThis.treeLeft)*parseInt(row.level);
					treeStyle = 'style="position:relative;';
					if(row.hasChild){
						if(oThis.options.autoExpand){
							spanStr = '<span class=" fa fa-minus-square-o u-grid-content-tree-span"></span>';
						}else{
							spanStr = '<span class=" fa fa-plus-square-o u-grid-content-tree-span"></span>';
						}
					}else{
						l += 16;
					}
					treeStyle += 'left:'+ l +'px;"';
				}
				if(!this.options.visible){
					tdStyle = 'style="display:none;"';
				}
				if(this.options.icon){
					iconStr = '<span class="' + this.options.icon + '"></span>';
				}
				// title="' + v + '" 创建td的时候不在设置title，在renderType中设置,处理现实xml的情况
				htmlStr += '<td role="rowcell"  '+ tdStyle +' title="' + v.replace(/\</g,'\<').replace(/\>/g,'\>') + '"><div class="u-grid-content-td-div" ' + treeStyle+'>' + spanStr + iconStr + '<span>' + v.replace(/\</g,'&lt;').replace(/\>/g,'&gt;') + '</span></div></td>';

			});

			return htmlStr;
		},
		/*
		 * 创建行td,针对IE
		 */
		createContentOneRowTdForIE:function(row,rowObj,createFlag){
			var oThis = this,gridCompColumnArr;
			if(createFlag == 'fixed'){
				gridCompColumnArr = this.gridCompColumnFixedArr;
			}else{
				gridCompColumnArr = this.gridCompColumnArr;
			}
			var value = rowObj.value;
			$.each(gridCompColumnArr, function() {
				var f = this.options.field,
					v = $(value).attr(f);
					v = oThis.getString(v,'');
				// tianxq begin
				if($.type(v) == 'object') {
					v = v.showValue
				}
				// tianxq end
				var renderType = this.options.renderType;
				var treeStyle = '';
				var spanStr ='';
				var iconStr = '';
				var vStr= '';
				var htmlStr = '';

				var newCell= row.insertCell();
				//newCell.row = 'rowcell';
				newCell.setAttribute("role","rowcell");
				newCell.title = v.replace(/\</g,'\<').replace(/\>/g,'\>');
				if(oThis.options.showTree && this.firstColumn){
					var l = parseInt(oThis.treeLeft)*parseInt(rowObj.level);
					treeStyle = 'style="position:relative;';
					if(rowObj.hasChild){
						if(oThis.options.autoExpand){
							spanStr = '<span class=" fa fa-minus-square-o u-grid-content-tree-span"></span>';
						}else{
							spanStr = '<span class=" fa fa-plus-square-o u-grid-content-tree-span"></span>';
						}
					}else{
						l += 18;
					}
					treeStyle += 'left:'+ l +'px;"';
				}
				if(!this.options.visible){
					newCell.style.display="none";
				}
				if(this.options.icon){
					iconStr = '<span class="' + this.options.icon + '"></span>';
				}
				htmlStr += '<div class="u-grid-content-td-div" ' + treeStyle+'>' + spanStr + iconStr + '<span>' + v.replace(/\</g,'&lt;').replace(/\>/g,'&gt;') + '</span></div>';
				newCell.insertAdjacentHTML('afterBegin',htmlStr);
			});
		},
		/*
		 * 创建合计行
		 */
		createSumRow:function(createFlag){
			if(this.options.showSumRow){
				var oThis = this,idStr,gridCompColumnArr;
				if(createFlag == 'fixed'){
					idStr = 'fixed_';
					gridCompColumnArr = this.gridCompColumnFixedArr;
				}else{
					idStr = '';
					gridCompColumnArr = this.gridCompColumnArr;
				}
				var t = parseInt(this.wholeHeight) - this.exceptContentHeight - 48 - this.scrollBarHeight;
				t = t> 0?t:0;
				var htmlStr = '<tr role="row" class="u-grid-content-sum-row" id="' + this.options.id + '_content_'+idStr+'sum_row" style="top:'+t+'px;">';
				$.each(gridCompColumnArr, function() {
					var f = this.options.field;
					var precision = this.options.precision;
					var dataType = this.options.dataType;
					var sumValue = oThis.dataSourceObj.getSumValue(f,this,oThis);
					if(dataType == 'float'){
						var o = {};
						o.value = sumValue;
						o.precision = precision?precision:2;
						sumValue = oThis.DicimalFormater(o)
					}
					var tdStyle = '';
					if(!this.options.visible){
						tdStyle = 'style="display:none;"';
					}
					htmlStr += '<td role="rowcell" title="' + sumValue + '" ' + tdStyle + '>';
					if(this.firstColumn){
						htmlStr += '<div class="u-gird-centent-sum-div"><span>' + oThis.transMap.ml_sum + '</span></div>';
					}
					var contentStyle = '';
					if(this.options.dataType == 'integer' || this.options.dataType == 'float') {
						contentStyle = 'style="text-align: right;"'
					}
					htmlStr += '<div class="u-grid-content-td-div" ' + contentStyle + '><span value="' + sumValue + '">' + sumValue + '</span></div></td>';				});
				htmlStr += '</tr>';
				return htmlStr;
			}
		},

		/*
		 * 创建合计行 for ie
		 */
		createSumRowForIE:function(table,createFlag){
			if(this.options.showSumRow){
				var oThis = this,idStr,gridCompColumnArr;
				if(createFlag == 'fixed'){
					idStr = 'fixed_';
					gridCompColumnArr = this.gridCompColumnFixedArr;
				}else{
					idStr = '';
					gridCompColumnArr = this.gridCompColumnArr;
				}
				var t = parseInt(this.wholeHeight) - this.exceptContentHeight - 48 - this.scrollBarHeight;
				t = t> 0?t:0;
				var row = table.insertRow();
				row.row = 'row';
				row.className = 'u-grid-content-sum-row';
				row.id = this.options.id + '_content_'+idStr+'sum_row';
				row.style.top = t + 'px';
				$.each(gridCompColumnArr, function() {
					var f = this.options.field;
					var precision = this.options.precision;
					var dataType = this.options.dataType;
					var sumValue = oThis.dataSourceObj.getSumValue(f,this,oThis);
					if(dataType == 'float'){
						var o = {};
						o.value = sumValue;
						o.precision = precision?precision:2;
						sumValue = oThis.DicimalFormater(o)
					}
					var newCell= row.insertCell();
					newCell.role = 'rowcell';
					newCell.title = sumValue;
					var contentStyle = '';
					if(this.options.dataType == 'integer' || this.options.dataType == 'float') {
						contentStyle = 'style="text-align: right;"'
					}
					var htmlStr = '<div class="u-grid-content-td-div" ' + contentStyle + '><span value="' + sumValue + '">' + sumValue + '</span></div>';
					newCell.insertAdjacentHTML('afterBegin',htmlStr);
				});
			}
		},
		/*
		 * 重画合计行
		 */
		repairSumRow:function(){
			if(this.options.showSumRow){
				$('#' + this.options.id + '_content_div tbody .u-grid-content-sum-row').remove();
				$('#' + this.options.id + '_content_fixed_div tbody .u-grid-content-sum-row').remove();
				try{
					if(this.dataSourceObj.rows && this.dataSourceObj.rows.length > 0){
						var htmlStr = this.createSumRow();
						$('#' + this.options.id + '_content_div tbody')[0].insertAdjacentHTML('beforeEnd',htmlStr);
						var htmlStr = this.createSumRow('fixed');
						$('#' + this.options.id + '_content_fixed_div tbody')[0].insertAdjacentHTML('beforeEnd',htmlStr);
					}
				}catch(e){
					var table = $('#' + this.options.id + '_content_div table')[0];
					var fixedTable = $('#' + this.options.id + '_content_fixed_div table')[0];
					this.createSumRowForIE(table);
					this.createSumRowForIE(table,'fixed');
				}
				this.renderSumRow();
			}
		},
		
		renderSumRow:function(){
			var oThis = this;
			$.each(this.gridCompColumnFixedArr, function(i) {
				var sumCol = this.options.sumCol;
				var sumRenderType = this.options.sumRenderType;
				var idStr = 'fixed_';
				if(sumCol) {
					var sumSpans = $('#' + oThis.options.id + '_content_'+idStr+'sum_row').find('td').eq(i).find('span');
					var sumSpan = sumSpans[sumSpans.length-1];
					if(sumSpan) {
						if(typeof sumRenderType == 'function') {
							var sumV = $(sumSpan).attr('value');
							var obj = {};
							obj.value = sumV;
							obj.element = sumSpan;
							obj.gridObj = oThis;
							obj.gridCompColumn = this;
							sumRenderType.call(oThis,obj);
						} else if(dataType == 'integer' || dataType == 'float'){
							sumSpan.style.textAlign = 'right';
						}
					}	
				}
			});
			$.each(this.gridCompColumnArr, function(i) {
				var sumCol = this.options.sumCol;
				var sumRenderType = this.options.sumRenderType;
				var idStr = '';
				if(sumCol) {
					var sumSpans = $('#' + oThis.options.id + '_content_'+idStr+'sum_row').find('td').eq(i).find('span');
					var sumSpan = sumSpans[sumSpans.length-1];
					if(sumSpan) {
						if(typeof sumRenderType == 'function') {
							var sumV = $(sumSpan).attr('value');
							var obj = {};
							obj.value = sumV;
							obj.element = sumSpan;
							obj.gridObj = oThis;
							obj.gridCompColumn = this;
							sumRenderType.call(oThis,obj);
						} else if(dataType == 'integer' || dataType == 'float'){
							sumSpan.style.textAlign = 'right';
						}
					}	
				}
			});
		},
		/*
		 * 重画内容区域
		 */
		repairContent: function(){
			var $pDiv = $('#' + this.options.id + '_content').parent();
			$('#' + this.options.id + '_content').remove(null, true);
			if($pDiv[0]){
				var htmlStr = this.createContent();
				$pDiv[0].insertAdjacentHTML('beforeEnd', htmlStr);
				this.renderTypeFun();
				this.initContentDivEventFun();
				if($('#' + this.options.id + '_content_div')[0]){
					$('#' + this.options.id + '_content_div')[0].scrollLeft = this.scrollLeft;
				}
				$('#' +this.options.id + '_content_edit_menu').css('display','none');
			}
			this.realtimeTableRows = null;
		},


		/*
		 * 创建form形式下div
		 */
		createFromDivs: function() {
			if (this.createFormFlag) {
				return;
			}
			var htmlStr = '<div id="' + this.options.id + '_form" class="u-grid-form">';
			htmlStr += this.createFromContent();
			$('#' + this.options.id)[0].insertAdjacentHTML('afterBegin', htmlStr);
			this.createFormFlag = true;
		},

		/*
		 * 创建form形式下内容区域
		 */
		createFromContent: function() {
			var htmlStr = '<div class="u-grid-form-content" id="' + this.options.id + '_form_content" class="u-grid-content">';
			htmlStr += '<table role="grid" id="' + this.options.id + '_form_content_table">';
			htmlStr += this.createFormContentRows();
			htmlStr += '</table>';
			return htmlStr;
		},

		/*
		 * 创建form形式下内容区域所有行
		 */
		createFormContentRows: function() {
			var oThis = this,
				htmlStr = "";
			// 遍历生成所有行
			if (this.dataSourceObj.rows) {
				htmlStr += '<tbody role="rowgroup" id="' + this.options.id + '_form_content_tbody">';
				$.each(this.dataSourceObj.rows, function() {
					htmlStr += '<tr role="row"><td role="rowcell">';
					var value = this.value;
					$.each(oThis.gridCompColumnArr, function() {
						var f = this.options.field,
							t = this.options.title,
							v = $(value).attr(f);
						htmlStr += '<div>' + t + ':</div>';
						htmlStr += '<div>' + v + '</div>';
					});
					htmlStr += '</td></tr>';
				});
				htmlStr += '</tbody>';
			}
			return htmlStr;
		},
				/*
		 * 创建完成之后顶层div添加监听
		 */
		initEventFun: function() {
			var oThis = this;
			$('#' + this.options.id).on('mousedown', function(e) {
				if ($(e.target).closest('#' + oThis.options.id + '_header').length > 0) {
					// 点击的是header区域
					oThis.mouseDownX = e.clientX;
					oThis.mouseDownY = e.clientY;
					var eleTh = $(e.target).closest('th')[0];
					if(oThis.canSwap){
						oThis.swapColumnStart(e, eleTh);
					}
					e.preventDefault();
				} else if ($(e.target).closest('#' + oThis.options.id + '_content').length > 0) {
					// 点击的是数据区域
				}
			});
			$('#' + this.options.id).on('mousemove', function(e) {
//				if (!oThis.countWidthFlag) {
//					oThis.countWidth(e); //某些情况下不是创建完就显示的，所以在mousemove中处理
//					oThis.countWidthFlag = true;
//				}
				if ($(e.target).closest('#' + oThis.options.id + '_header').length > 0) {
					// 在header区域移动
					var eleTh = $(e.target).closest('th')[0];
					// 将其他列的操作按钮隐藏，显示当前列的
					oThis.headerThDrag(e, eleTh);
				}
				oThis.mouseMoveX = e.clientX;
				oThis.mouseMoveY = e.clientY;
				if ((oThis.mouseMoveX != oThis.mouseDownX || oThis.mouseDownY != oThis.mouseMoveY) && oThis.mouseDownX != 'mouseDownX' && oThis.canSwap) {
					// 鼠标按下之后移动了
					oThis.swapColumnFlag = true;
				}
				oThis.dragFun(e);
				oThis.swapColumnFun(e);
				e.stopPropagation();
			});
			$('#' + this.options.id + '_top').on('mousemove', function(e) {
				oThis.mouseMoveX = e.clientX;
				oThis.mouseMoveY = e.clientY;
				if ((oThis.mouseMoveX != oThis.mouseDownX || oThis.mouseDownY != oThis.mouseMoveY) && oThis.mouseDownX != 'mouseDownX' && oThis.canSwap) {
					// 鼠标按下之后移动了
					oThis.swapColumnFlag = true;
				}
				oThis.dragFun(e);
				oThis.swapColumnFun(e);
				e.stopPropagation();
			});
			$('#' + this.options.id).on('mouseup', function(e) {
				if ($(e.target).closest('#' + oThis.options.id + '_header').length > 0) {
					// 点击的是header区域
					oThis.mouseUpX = e.clientX;
					oThis.mouseUpY = e.clientY;
					//点击过程中鼠标没有移动
					if (oThis.mouseDownX == oThis.mouseUpX && oThis.mouseDownY == oThis.mouseUpY) {
					//或者移动距离小于5px(由于移动之后会显示屏幕div，暂时不做处理)
//					if( Math.abs(parseInt(oThis.mouseDownX) - parseInt(oThis.mouseUpX)) <=5 && Math.abs(parseInt(oThis.mouseDownY) - parseInt(oThis.mouseUpY)) <=5){
						oThis.columnClickX = e.clientX;
						oThis.columnClickY = e.clientY;
						var eleTh = $(e.target).closest('th')[0];
						if($(e.target).hasClass('u-grid-header-columnmenu')){
							//点击的是columnmenu
							$('#' + oThis.options.id + '_column_menu').css('display','block');
							var left = eleTh.attrRightTotalWidth - oThis.scrollLeft + oThis.leftW + oThis.fixedWidth - 20;
							if(left + oThis.columnMenuWidth > oThis.wholeWidth)
								left = eleTh.attrRightTotalWidth - oThis.scrollLeft + oThis.leftW + oThis.fixedWidth - oThis.columnMenuWidth + 1;
							$('#' + oThis.options.id + '_column_menu').css('left',left);
							$('#' + oThis.options.id + '_column_menu').css('top',oThis.headerHeight);
							oThis.ele.createColumnMenuFlage = true;
						}else{
							// 执行click操作,进行排序
							oThis.canSortable(e, eleTh);
						}
					}
				} else if ($(e.target).closest('#' + oThis.options.id + '_content').length > 0) {
					// 点击的是数据区域

				}
				oThis.dragEnd(e);
				oThis.swapColumnEnd(e);
				oThis.mouseUpX = 'mouseUpX';
				oThis.mouseUpY = 'mouseUpY';
				oThis.mouseDownX = 'mouseDownX';
				oThis.mouseDownY = 'mouseDownY';
				oThis.mouseMoveX = 'mouseMoveX';
				oThis.mouseMoveY = 'mouseMoveY';
			});
			$('#' + this.options.id+ '_top').on('mouseup', function(e) {
				oThis.dragEnd(e);
				oThis.swapColumnEnd(e);
				oThis.mouseUpX = 'mouseUpX';
				oThis.mouseUpY = 'mouseUpY';
				oThis.mouseDownX = 'mouseDownX';
				oThis.mouseDownY = 'mouseDownY';
				oThis.mouseMoveX = 'mouseMoveX';
				oThis.mouseMoveY = 'mouseMoveY';
			});
			$(document).on('click',function(){
				if(oThis.columnMenuMove == false && oThis.ele.createColumnMenuFlage == false){
					$('#' + oThis.options.id + '_column_menu',oThis.$ele).css('display','none');
				}
				oThis.ele.createColumnMenuFlage = false;
			});
		},

		/*
		 * 创建完成之后grid层 div添加监听
		 */
		initGridEventFun: function() {
			var oThis = this;
			// 拖动
			$('#' + this.options.id + '_resize_handle').on('mousedown', function(e) {
				oThis.dragStart(e);
				return false;
			});

			// 列头按钮显示/隐藏
			$('#' + this.options.id + '_header_table th').on('mousemove',function(e){
				$('.u-grid-header-columnmenu',$(this)).css('display','block');
			});

			$('#' + this.options.id + '_header_table th').on('mouseout',function(e){
				$('.u-grid-header-columnmenu',$(this)).css('display','none');
			});

			this.initContentDivEventFun();

			// 全选
			$('#' + this.options.id + '_header_multi_input').on('click', function(e) {
				if(this.checked){
					oThis.setAllRowSelect();
				}else{
					oThis.setAllRowUnSelect();
				}
			});


			/*header 按钮处理开始*/
			// column按钮
			$('#' + this.options.id + '_column_menu_ul').on('mousemove', function(e) {
				oThis.columnMenuMove = true;
			});
			$('#' + this.options.id + '_column_menu_ul').on('mouseout', function(e) {
				oThis.columnMenuMove = false;
			});

			// 显示/隐藏列按钮
			$('#' + this.options.id + '_showColumn').on('mousemove', function(e) {
				//待完善 考虑屏幕高度决定columnMenu显示形式

				if(oThis.hideMenuColumns)
					clearTimeout(oThis.hideMenuColumns);
				if($('#' + oThis.options.id + '_column_menu_columns').css('display') == 'block')
					return;
				var sX = $(window).width();
				var sH = $(window).height();

				var menuLeft = $('#' + oThis.options.id + '_column_menu').css('left');
				var columnsLeft = parseInt(menuLeft) + oThis.columnMenuWidth;
				var maxLeft = oThis.columnClickX + oThis.columnMenuWidth * 2;
				if(maxLeft > sX)
					columnsLeft = parseInt(menuLeft) - oThis.columnMenuWidth;
				$('#' + oThis.options.id + '_column_menu_columns').css('left',columnsLeft);
				var columnsTop = oThis.headerHeight;
				var cY = e.clientY;
				// 如果数据列高度高于屏幕高度则数据列高度设置为屏幕高度-10；
				var columnsHeight = oThis.menuColumnsHeight;
				var hh = 0;
				if((oThis.menuColumnsHeight + 30) > sH){
					columnsHeight = sH - 30;
					$('#' + oThis.options.id + '_column_menu_columns').css('height',columnsHeight + 'px');
				}else{
					$('#' + oThis.options.id + '_column_menu_columns').css('height','');
				}
				var maxHeight = cY + columnsHeight;
				if(maxHeight > sH)
					columnsTop = (cY - (sH - columnsHeight)) * -1 + 30;
				$('#' + oThis.options.id + '_column_menu_columns').css('top',columnsTop);
				$('#' + oThis.options.id + '_column_menu_columns').css('display','block');
				oThis.columnMenuMove = true;
			});
			$('#' + this.options.id + '_showColumn').on('mouseout', function(e) {
				oThis.hideMenuColumns = setTimeout(function(){
					$('#' + oThis.options.id + '_column_menu_columns').css('display','none');
					oThis.columnMenuMove = false;
				},200);

			});
			$('#' + this.options.id + '_column_menu_columns').on('mousemove', function(e) {
				if(oThis.hideMenuColumns)
					clearTimeout(oThis.hideMenuColumns);
				$('#' + oThis.options.id + '_column_menu_columns').css('display','block');
				oThis.columnMenuMove = true;
			});
			$('#' + this.options.id + '_column_menu_columns').on('mouseout', function(e) {
				oThis.hideMenuColumns = setTimeout(function(){
					$('#' + oThis.options.id + '_column_menu_columns').css('display','none');
					oThis.columnMenuMove = false;
				},200);
			});

			// 清除设置按钮
			$('#' + this.options.id + '_clearSet').on('click', function(e) {
				oThis.clearLocalData();
				oThis.initGridCompColumn();
				// 清除排序
				oThis.dataSourceObj.sortRows();
				oThis.repaintGridDivs();
				if(typeof oThis.options.onClearSetFun == 'function'){
					oThis.options.onClearSetFun(oThis);
				}
			});
			// 显示/隐藏列 对应所有列的点击处理
			$('#' + this.options.id + '_column_menu_columns_ul li input').on('click', function(e) {
				//待完善 优化与li的click的代码整合
				var index = $(this).closest('li').attr('index');

				if(oThis.gridCompColumnArr[index].options.visible){
					$(this)[0].checked = false;
					var ll = $('input:checked',$('#' + oThis.options.id + '_column_menu_columns_ul')).length;
					if(ll == 0){
						$(this)[0].checked = true;
						return;
					}

					if(document.documentMode == 8){
						oThis.gridCompColumnArr[index].options.visible = false;
						oThis.repaintGridDivs();
					}else{
						oThis.setColumnVisibleByIndex(index,false);
						oThis.gridCompColumnArr[index].options.visible = false;
					}
				}else{
					$(this)[0].checked = true;

					if(document.documentMode == 8){
						oThis.gridCompColumnArr[index].options.visible = true;
						oThis.repaintGridDivs();
					}else{
						oThis.setColumnVisibleByIndex(index,true);
						oThis.gridCompColumnArr[index].options.visible = true;
					}

				}
				oThis.saveGridCompColumnArrToLocal();
				e.stopPropagation();
			});
			$('#' + this.options.id + '_column_menu_columns_ul li').on('click', function(e) {
				var index = $(this).attr('index');
				var gridCompColumn = oThis.gridCompColumnArr[index];
				if(!gridCompColumn.options.canVisible){
					return false;
				}
				//获取选中列数量，不能小于1
				if(gridCompColumn.options.visible){
					$('input',$(this))[0].checked = false;
					var ll = $('input:checked',$('#' + oThis.options.id + '_column_menu_columns_ul')).length;
					if(ll == 0){
						$('input',$(this))[0].checked = true;
						return;
					}
					oThis.setColumnVisibleByIndex(index,false);
					oThis.gridCompColumnArr[index].options.visible = false;
				}else{
					$('input',$(this))[0].checked = true;
					oThis.setColumnVisibleByIndex(index,true);
					oThis.gridCompColumnArr[index].options.visible = true;
				}
				oThis.saveGridCompColumnArrToLocal();
			});
			/*header 按钮处理结束*/
			// 行编辑按钮相关事件
			/*$('#' + this.options.id + '_content_edit_menu_ok').on('click',function(e){
				oThis.editOk();
			});
			$('#' + this.options.id + '_content_edit_menu_cancel').on('click',function(e){
				oThis.editCancel();
			});*/


		},
		/*
		 * 内容区 div添加监听
		 */
		initContentDivEventFun:function(){
			var oThis = this;

			// 通过复选框设置选中行
			$('#' + oThis.options.id + '_content .u-grid-content-left').on('click',function(e){
				var $input = $(e.target).closest('input');
				if($input.length > 0){
					var $div = $($input.parent());
					var index = $('.u-grid-content-multiSelect',$div.parent()).index($div);
					if($input[0].checked){
						oThis.setRowSelect(index);
					}else{
						oThis.setRowUnselect(index);
					}
				}
			});

			// 同步滚动条
			$('#' + this.options.id + '_content_div').on('scroll', function(e) {
				oThis.scrollLeft = this.scrollLeft;
				oThis.scrollTop = this.scrollTop;
				$('#' + oThis.options.id + '_header_table').css('left', oThis.leftW - oThis.scrollLeft + oThis.fixedWidth + "px");
				$('#' + oThis.options.id + '_noRowsShow').css('left', oThis.scrollLeft + "px");
				$('#' + oThis.options.id + '_edit_form').css('left', oThis.scrollLeft + "px");
				$('#' + oThis.options.id + '_content_multiSelect').css('top', -oThis.scrollTop + "px");
				$('#' + oThis.options.id + '_content_numCol').css('top', -oThis.scrollTop + "px");
				$('#' + oThis.options.id + '_content_fixed_div').css('top', -oThis.scrollTop + "px");
			});



			// 数据行相关事件
			$('#' + this.options.id + '_content_tbody').on('click',function(e){
				// 双击处理
				if(typeof oThis.options.onDblClickFun == 'function'){
					oThis.isDblEvent('tbodyClick',oThis.dblClickFun,e,oThis.clickFun,e);
				}else{
					oThis.clickFun(e);
				}
			});

			$('#' + this.options.id + '_content_fixed_tbody').on('click',function(e){
				// 双击处理
				if(typeof oThis.options.onDblClickFun == 'function'){
					oThis.isDblEvent('tbodyClick',oThis.dblClickFun,e,oThis.clickFun,e);
				}else{
					oThis.clickFun(e);
				}
			});

			$('#' + this.options.id + '_content').on('mousemove', function(e) {
				var $tr = $(e.target).closest('tr');
				var $div = $(e.target).closest('div');
				var mousemoveIndex = -1;
				// 首先清除所有的背景
				if($tr.length > 0){
					mousemoveIndex = $('tr',$tr.parent()).index($tr);
				}else if($div.length > 0 && ($div.hasClass('u-grid-content-multiSelect') || $div.hasClass('u-grid-content-num'))){ //左侧复选及数字列
					mousemoveIndex = $('div',$div.parent()).index($div);
				}

				oThis.trHoverFun(mousemoveIndex);
			});

			$('#' + this.options.id + '_content').on('mouseout', function(e) {
				$('#' + oThis.options.id + '_content_tbody').find('tr').removeClass('u-grid-move-bg');
				$('#' + oThis.options.id + '_content_fixed_tbody').find('tr').removeClass('u-grid-move-bg');
				if(oThis.options.multiSelect)
					$('#' + oThis.options.id + '_content_multiSelect').find('div').removeClass('u-grid-move-bg');
				if(oThis.options.showNumCol)
					$('#' + oThis.options.id + '_content_numCol').find('div').removeClass('u-grid-move-bg');
			});
		},

		trHoverFun:function(index){
			var oThis = this;
			$('#' + oThis.options.id + '_content_tbody').find('tr').removeClass('u-grid-move-bg');
			$('#' + oThis.options.id + '_content_fixed_tbody').find('tr').removeClass('u-grid-move-bg');
			if(oThis.options.multiSelect)
				$('#' + oThis.options.id + '_content_multiSelect').find('div').removeClass('u-grid-move-bg');
			if(oThis.options.showNumCol)
				$('#' + oThis.options.id + '_content_numCol').find('div').removeClass('u-grid-move-bg');
			if(index > -1){
				var $tr = $('#' + oThis.options.id + '_content_tbody').find('tr').eq(index);
				if($tr[0].id && $tr[0].id == oThis.options.id + '_edit_tr'){
					return;
				}
				$('#' + oThis.options.id + '_content_tbody').find('tr').eq(index).addClass('u-grid-move-bg');
					$('#' + oThis.options.id + '_content_fixed_tbody').find('tr').eq(index).addClass('u-grid-move-bg');
					if(oThis.options.multiSelect)
						$('#' + oThis.options.id + '_content_multiSelect').find('div').eq(index).addClass('u-grid-move-bg');
					if(oThis.options.showNumCol)
						$('#' + oThis.options.id + '_content_numCol').find('div').eq(index).addClass('u-grid-move-bg');

					if(typeof oThis.options.onRowHover == 'function' && !$tr.is('.u-grid-content-sum-row')){
						var obj = {};
						obj.gridObj = oThis;
						obj.rowObj = oThis.dataSourceObj.rows[index];
						obj.rowIndex = index;
						oThis.options.onRowHover(obj);
					}
			}

		},

		/*
		 * 定时器处理
		 */
		setIntervalFun: function(e) {
			this.widthChangeFun();
			this.heightChangeFun();
			this.editorRowChangeFun();
		},

		editorRowChangeFun: function(){
			if($('#' + this.options.id + '_edit_form').length > 0){
				var h = $('#' + this.options.id + '_edit_form')[0].offsetHeight;
				$('#' + this.options.id + '_numCol_edit').css('height',h);
				$('#' + this.options.id + '_multiSelect_edit').css('height',h);
			}
		},


		/*
		 * grid区域创建完成之后处理
		 * 1、数据列显示处理
		 * 2、取行高
		 */
		afterGridDivsCreate:function(){
			this.columnsVisibleFun();
			this.resetThVariable();
			this.countRowHeight();
			this.noRowsShowFun();
			var obj = {};
			this.renderTypeFun();

			this.resetScrollLeft();
			this.hideEditMenu();
		},

		/*
		 * 取行高
		 */
		countRowHeight:function(){
			if($('#' + this.options.id + '_content_tbody tr')[0]){
				this.rowHeight = $('#' + this.options.id + '_content_tbody tr')[0].offsetHeight;
			}
		},

		/*
		 * 处理是否显示无数据行
		 */
		noRowsShowFun:function(){
			if(this.dataSourceObj.rows && this.dataSourceObj.rows.length > 0){
				$('#' + this.options.id + '_noRowsShow').css('display','none');
				$('#' + this.options.id + '_noRows').css('display','none');
			}else{
				$('#' + this.options.id + '_noRowsShow').css('display','block');
				$('#' + this.options.id + '_noRows').css('display','block');
			}
		},

		/*
		 * 更新最后数据行标识
		 */
		updateLastRowFlag: function(){
			var rows =$('#' + this.options.id + '_content_tbody').find('tr[role=row]')
			for(var i=0, count = rows.length; i<count; i++){
				if (i == count -1)
					$(rows[i]).addClass('last-row')
				else
					$(rows[i]).removeClass('last-row')
			}

		},
		updateNumColLastRowFlag: function(){
			var numCols =$('#' + this.options.id + '_content_numCol').find('.u-grid-content-num')
			for(var i=0, count = numCols.length; i<count; i++){
				if (i == count -1)
					$(numCols[i]).addClass('last-row')
				else
					$(numCols[i]).removeClass('last-row')
			}
		},
		/*
		 * 处理renderType
		 * begin为起始行，length为行数（增加行数时使用）
		 */
		renderTypeFun:function(obj){
			if(!this.isGridShow())
				return;
			if(typeof obj == 'undefined'){
				var begin = null,length = null,field = '';
			}else{
				var begin = typeof obj.begin == 'undefined'?null:obj.begin,length = typeof obj.length == 'undefined'?null:obj.length,field = typeof obj.field == 'undefined'?'':obj.field;
			}
			var oThis = this,begin = parseInt(begin),length = parseInt(length);
			var end = begin;
			if(length >0){
				end = parseInt(begin + length - 1);
			}

			if (field == ''){
				$.each(this.gridCompColumnFixedArr,function(i){
					oThis.renderTypeByColumn(this,i,begin,length,true);
				})
				$.each(this.gridCompColumnArr,function(i){
					oThis.renderTypeByColumn(this,i,begin,length, false);
				})
			}
			else{
				var rendered = false
				$.each(this.gridCompColumnFixedArr,function(i){
					if (this.options.field == field){
						oThis.renderTypeByColumn(this,i,begin,length,true);
						rendered = true
						return;
					}
				})
				if (!rendered)
					$.each(this.gridCompColumnArr,function(i){
						if (this.options.field == field){
							oThis.renderTypeByColumn(this,i,begin,length,false);
							return;
						}
					})

			}
//
//			if(createFlag == 'fixed'){
//				$.each(this.gridCompColumnFixedArr,function(i){
//					oThis.renderTypeByColumn(this,i,begin,length,true);
//				})
//			}else{
//				$.each(this.gridCompColumnArr,function(i){
//					oThis.renderTypeByColumn(this,i,begin,length, false);
//				})
//			}
		},
		/*
		 * 处理renderType
		 * gridCompColumn对象，index为第几列
		 * begin为起始行，length为行数（增加行数时使用）
		 */
		renderTypeByColumn:function(gridCompColumn,i,begin,length, isFixedColumn){
			var oThis = this;
			var renderType = gridCompColumn.options.renderType;
			var sumCol = gridCompColumn.options.sumCol;
			var sumRenderType = gridCompColumn.options.sumRenderType;
			var dataType = gridCompColumn.options.dataType;
			var precision = gridCompColumn.options.precision;
			var format = gridCompColumn.options.format;
			var field = gridCompColumn.options.field;
			var end = begin;
			var idSuffix = isFixedColumn === true ? '_content_fixed_tbody' : '_content_tbody'
			var idStr = isFixedColumn === true? 'fixed_' : '';
			if(length >0){
				end = parseInt(begin + length - 1);
			}
			//if(!this.realtimeTableRows)
				this.realtimeTableRows = document.getElementById(oThis.options.id + idSuffix).children;


				// 记录role不是row的行
				var notRowIndex = -1;
				for(var k = 0;k < oThis.realtimeTableRows.length;k++) {
					if(oThis.realtimeTableRows[k].getAttribute("role") != "row") {
						notRowIndex = k
					}
				}
				$.each(oThis.dataSourceObj.rows, function(j) {
					if((begin >= 0 && j >= begin && j <= end) || isNaN(begin)){
						//var td = $('#' + oThis.options.id + '_content_tbody tr:eq(' + j + ') td:eq(' +i+ ')')[0];  //modify by licza
						var trIndex = j;
						if(notRowIndex != -1 && j >= notRowIndex) {
							trIndex++;
						}
						var tr = oThis.realtimeTableRows[trIndex];
						var td = tr.children[i];//$('#' + oThis.options.id + idSuffix).find('tr[role="row"]').eq(j ).find('td')[i];
						if(td){
							//var span = $('#' + oThis.options.id + '_content_tbody tr:eq(' + j + ') td:eq(' +i+ ') span:last-child')[0];  //modify by licza
							 //$('#' + oThis.options.id + idSuffix).find('tr[role="row"]').eq( j).find('td').eq(i).find('span:last-child') [0];
							if(td.children[0].innerHTML.indexOf('u-grid-content-tree-span')   !=  -1){
								var span =  td.children[0].children[1];
							}else{
								var span =  td.children[0];
							}
							if(span){
								var v = $(this.value).attr(field);
								if(typeof renderType == 'function' || dataType == 'date' || dataType == 'datetime' || dataType == 'integer' || dataType == 'float'){
//								span.removeAttribute("style")
									span.innerHTML = '';
									if(typeof renderType == 'function'){
										v = oThis.getString(v,'');
										var obj = {};
										obj.value = v;
										obj.element = span;
										obj.gridObj = oThis;
										obj.row = this;
										obj.gridCompColumn = gridCompColumn;
										obj.rowIndex = j;
										renderType.call(oThis,obj);
									}else if(dataType == 'date' || dataType == 'datetime'){
										if(v == null || v == undefined || v == 'null' || v == 'undefined' || v == ""){
											v = "";
										}
										// 处理逻辑一致，format值不同
										var dateObj = new Date(v);
										if(parseInt(dateObj.valueOf()) > 0){
											v = dateObj.format(format);
										}else{
											// 依赖 moment.js
											dateObj = moment(v,'YYYY-MM-DD HH:mm:ss').toDate();
											if(parseInt(dateObj.valueOf()) > 0){
												v = dateObj.format(format);
											}
										}
										span.innerHTML = v;
										td.title = v;
									}else if(dataType == 'integer'){
										v = parseInt(v);
										span.innerHTML = v;
										td.title = v;
									}else if(dataType == 'float'){
										if(precision){
											var o = {};
											o.value = v;
											o.precision = precision;
											v = oThis.DicimalFormater(o);
										}else{
											v = parseFloat(v);
										}
										span.innerHTML = v;
										td.title = v;
									}else{ //此处逻辑放到渲染处，减少render执行次数。
										v = oThis.getString(v,'');
										var v1 = v.replace(/\</g,'\<');
										v1 = v1.replace(/\>/g,'\>');
										td.title = v;
										v = v.replace(/\</g,'&lt;');
										v = v.replace(/\>/g,'&gt;');

										span.innerHTML = v;
									}
								}else{
									v = oThis.getString(v,'');
									var v1 = v.replace(/\</g,'\<');
									v1 = v1.replace(/\>/g,'\>');
									td.title = v;
									v = v.replace(/\</g,'&lt;');
									v = v.replace(/\>/g,'&gt;');

									span.innerHTML = v;
								}
							}

						}
					}
				});

				if(sumCol) {
					var sumSpans = $('#' + this.options.id + '_content_'+idStr+'sum_row').find('td').eq(i).find('span');
					var sumSpan = sumSpans[sumSpans.length-1];
					if(sumSpan) {
						if(typeof sumRenderType == 'function') {
							var sumV = $(sumSpan).attr('value');
							var obj = {};
							obj.value = sumV;
							obj.element = sumSpan;
							obj.gridObj = oThis;
							obj.gridCompColumn = gridCompColumn;
							sumRenderType.call(oThis,obj);
						} else if(dataType == 'integer' || dataType == 'float'){
							sumSpan.style.textAlign = 'right';
						}
					}	
				}

		},

		/*
		 * grid区域重画完成之后处理，已经执行过afterGridDivsCreate
		 * 1、设置横向滚动条
		 * 2、隐藏编辑按钮
		 */
		afterRepaintGrid:function(){
			this.resetScrollLeft();
			this.hideEditMenu();
		},
		/*
		 * 设置横向滚动条
		 */
		resetScrollLeft:function(){
			if($('#' + this.options.id + '_content_div')[0]){
				$('#' + this.options.id + '_content_div')[0].scrollLeft = this.scrollLeft;
			}
		},
		/*
		 * 隐藏编辑按钮
		 */
		hideEditMenu:function(){
			$('#' +this.options.id + '_content_edit_menu').css('display','none');
		},		/*
		 * 整体宽度改变处理
		 */
		widthChangeFun: function() {
			var oThis = this;
			if($('#' + this.options.id)[0]){
				// 获取整体区域宽度
				var w = $('#' + this.options.id).width()  //[0].offsetWidth;
				if(this.wholeWidth != w){
					this.wholeWidth = w;
					
					if(w < this.options.formMaxWidth){
//						this.showType = '';
					}
					// 树展开/合上的时候会导致页面出现滚动条导致宽度改变，没有&&之后会重新刷新页面导致无法收起
					if (w > this.options.formMaxWidth && ((this.showType == 'form' || this.showType == '') || !$('#' + this.options.id + '_content_div tbody')[0]) || this.options.overWidthHiddenColumn) { //lyk--需要完善隐藏之后再显示同事添加数据操作
						//不再延迟渲染，通过其他方式控制第一次渲染的时候宽度是固定的。
						/*if(this.widthChangeGridS)
							clearTimeout(this.widthChangeGridS);
						this.widthChangeGridS = setTimeout(function(){
							oThis.widthChangeGridFun();
						},500);*/
						oThis.widthChangeGridFun();
					} else if (w > 0 && w < this.options.formMaxWidth && (this.showType == 'grid' || this.showType == '')) {
//						this.widthChangeFormFun();
					}
					// 某些情况下需要重复执行，待优化，去掉，以后也不应该执行这段代码
					if(w > this.options.formMaxWidth){
						this.contentMinWidth = parseInt(this.wholeWidth) - parseInt(this.leftW) - parseInt(this.fixedWidth);
						if(this.contentMinWidth < 0)
							this.contentMinWidth = 0;
						setTimeout(function(){
							$('#' + oThis.options.id + '_header_wrap').css('max-width', (oThis.wholeWidth - 4) + 'px');
							$('#' + oThis.options.id + '_content_div').css('width', oThis.contentMinWidth  + 'px');
							$('#' + oThis.options.id + '_content_table').css('min-width', oThis.contentMinWidth  + 'px');
							$('#' + oThis.options.id + '_content_table').css('width', oThis.contentMinWidth  + 'px');
							$('#' + oThis.options.id + '_header_table').css('min-width', oThis.contentMinWidth + 'px');
							$('#' + oThis.options.id + '_header_table').css('width', oThis.contentMinWidth + 'px');
							$('#' + oThis.options.id + '_noRowsShow').css('width', oThis.contentMinWidth + 'px');
							//滚动条可能发生变化导致grid内部列的宽度发生变化
							oThis.columnsVisibleFun();
							if(oThis.contentRealWidth < oThis.contentMinWidth){
								oThis.contentWidth = oThis.contentMinWidth;
							}else{
								oThis.contentWidth = oThis.contentRealWidth;
							}
							$('#' + oThis.options.id + '_noRows').css('width', oThis.contentWidth + 'px');
							if(typeof oThis.options.afterCreate == 'function'){
								oThis.options.afterCreate.call(oThis);
							}
						},300);
					}
				}
				$('#' + oThis.options.id + '_header_table').css('width', oThis.contentMinWidth + 'px');
				$('#' + oThis.options.id + '_edit_form').css('width', oThis.contentMinWidth + 'px');

			}
		},

		/*
		 * 整体宽度改变处理(grid形式)
		 */
		widthChangeGridFun: function() {
			var oThis = this;
			var halfWholeWidth = parseInt(this.wholeWidth/2);
			// 固定区域宽度不大于整体宽度的一半
			if(this.fixedRealWidth > halfWholeWidth){
				this.fixedWidth = halfWholeWidth;
			}else{
				this.fixedWidth = this.fixedRealWidth;
			}
			
			/* 如果宽度不足处理自动隐藏*/
			if(this.options.overWidthHiddenColumn){
				this.lastVisibleColumn.options.width = this.lastVisibleColumn.options.realWidth;
				var wholeWidth = parseInt(this.wholeWidth) - parseInt(this.leftW);
				var columnWholeWidth = parseInt(this.fixedWidth) + parseInt(this.contentRealWidth);
				if(columnWholeWidth > wholeWidth){
					for(var i = 0;i < this.gridCompHiddenLevelColumnArr.length;i++){
						var column = this.gridCompHiddenLevelColumnArr[i];
						if(column.options.visible){
							column.options.visible = false;
							columnWholeWidth = columnWholeWidth - column.options.width;
						} 
						if(!(columnWholeWidth > wholeWidth)){
							break;
						}
					}
					this.columnsVisibleFun();
				}else{
					for(var i = this.gridCompHiddenLevelColumnArr.length -1;i>-1;i--){
						var column = this.gridCompHiddenLevelColumnArr[i];
						if(!column.options.visible){
							columnWholeWidth = columnWholeWidth + column.options.width;
							if(columnWholeWidth > wholeWidth){
								break;
							}
							column.options.visible = true;
						}
					}
					this.columnsVisibleFun();
				}
			}
			
			// 内容区域宽度自动扩展
			this.contentMinWidth = parseInt(this.wholeWidth) - parseInt(this.leftW) - parseInt(this.fixedWidth);
			if(this.contentMinWidth < 0)
				this.contentMinWidth = 0;
			if(this.contentRealWidth < this.contentMinWidth){
				this.contentWidth = this.contentMinWidth;
				var oldWidth = this.lastVisibleColumn.options.width;
				this.lastVisibleColumnWidth = oldWidth + (this.contentMinWidth - this.contentRealWidth);
				// modfied by tianxq1 最后一列自动扩展
				this.lastVisibleColumn.options.width = this.lastVisibleColumnWidth-20;
			}else{
				this.contentWidth = this.contentRealWidth;
			}
			
			this.createGridFlag = false;
			this.createGridDivs();
			$('#' + this.options.id + '_form').css('display', 'none');
			$('#' + this.options.id + '_grid').css('display', 'block');
		},

		/*
		 * 整体宽度改变处理(form形式)
		 */
		widthChangeFormFun: function() {
			this.createFromDivs();
			$('#' + this.options.id + '_grid').css('display', 'none');
			$('#' + this.options.id + '_form').css('display', 'block');
			this.showType = 'form';
			if(typeof this.options.afterCreate == 'function'){
				this.options.afterCreate.call(this);
			}
		},
		/*
		 * 整体高度改变处理
		 */
		heightChangeFun: function() {
			if(this.countContentHeight){
				var oldH = this.wholeHeight,
					h = $('#' + this.options.id)[0].offsetHeight;
				this.wholeHeight = h;
				if (oldH != h) {
					var contentH = h - this.exceptContentHeight > 0 ? h - this.exceptContentHeight : 0;
					$('#' + this.options.id + '_content').css('height', contentH + 'px');
					$('#' + this.options.id + '_content_div').css('height', contentH + 'px');
				}
			}
		},




		/*
		 * column是否显示处理，只在初始化gridCompColumn对象时调用，其他时候不再调用
		 * 计算固定区域及内容区域的真实宽度
		 * 计算第一列
		 * 计算内容区域最后一列显示列
		 */
		columnsVisibleFun:function(){
			var oThis = this;
			var fixW = 0;
			var w = 0;
			this.firstColumn = true;

			$.each(this.gridCompColumnFixedArr,function(){
				if(this.options.visible){
					fixW += parseInt(this.options.width);
					this.firstColumn = oThis.firstColumn;
					oThis.firstColumn = false;
				}
			});
			this.fixedRealWidth = fixW;

			$.each(this.gridCompColumnArr,function(){
				if(this.options.visible){
					w+=parseInt(this.options.width);
					this.firstColumn = oThis.firstColumn;
					oThis.firstColumn = false;
					oThis.lastVisibleColumn = this;
					oThis.lastVisibleColumnWidth = this.options.width;
				}
			});
			this.contentRealWidth = w;
		},
		/*
		 * 创建完成之后处理变量
		 */
		resetThVariable: function() {
			if(this.showType != 'grid')
				return;
			var oThis = this;
			this.contentWidth = 0;
			var oldParentHeaderStr = '';
			var parentWidth = 0;

			// 记录每列宽度及当前宽度之和
			
			$('#' + this.options.id + '_header_table th', this.$ele).each(function(i) {  //会出现th多于列的情况，发现问题之后再看下为什么
				var gridCompColumn = oThis.gridCompColumnArr[i];
				var parentHeaderStr = oThis.getString(gridCompColumn.options.parentHeader,'');
				var w = 0;
				if(gridCompColumn.options.visible){
					w = gridCompColumn.options.width;
				}
				this.attrLeftTotalWidth = oThis.contentWidth;
				oThis.contentWidth += w;
				if (!$('#' + oThis.options.id + '_resize_handle')[0].nowTh && gridCompColumn.options.canDrag) {
					$('#' + oThis.options.id + '_resize_handle').css('left', w - 4 + oThis.leftW);
					$('#' + oThis.options.id + '_resize_handle')[0].nowTh = this;
				}
				this.gridCompColumn = gridCompColumn;
				this.attrWidth = w;
				this.attrRightTotalWidth = oThis.contentWidth;
				// 处理多表头

				if(oldParentHeaderStr != '' && parentHeaderStr != oldParentHeaderStr){ // 上一个父项结束
					// 设置宽度
					$('#' + oThis.options.id + oldParentHeaderStr).css('width',parentWidth - 1 + 'px');
				}

				if(parentHeaderStr != ''){
					var parentHeaderTitleStr = oThis.getLevelTitleByField(parentHeaderStr);
					if(parentHeaderStr != oldParentHeaderStr){  //一个新的父项开始
						parentWidth = 0;
						if(!oThis.parentFlag){ //只添加一次
							var htmlStr ='<div id="' + oThis.options.id + parentHeaderStr + '" class="u-gird-parent"><div class="u-grid-header-link" title="' + parentHeaderTitleStr + '">' + parentHeaderTitleStr +'</div></div>';
							this.insertAdjacentHTML('afterBegin',htmlStr);
						}
					}
					parentWidth += w;
				}

				oldParentHeaderStr = parentHeaderStr;
			});

			if(oldParentHeaderStr != ''){
				$('#' + oThis.options.id + oldParentHeaderStr).css('width',parentWidth - 1 + 'px');
			}
			this.parentFlag = true;
		},

		/*
		 * 内容区宽度改变
		 */
		contentWidthChange:function(newContentWidth){
			if(newContentWidth < this.contentMinWidth){
				var oldW = this.lastVisibleColumn.options.width;
				this.lastVisibleColumnWidth = oldW + (this.contentMinWidth - newContentWidth);
				$('#' + this.options.id + '_header_table col:last').css('width', this.lastVisibleColumnWidth + "px");
				$('#' + this.options.id + '_content_table col:last').css('width', this.lastVisibleColumnWidth + "px");
				newContentWidth = this.contentMinWidth;
			}
			$('#' + this.options.id + '_content_table').css('width', newContentWidth + "px");
			$('#' + this.options.id + '_noRows').css('width', newContentWidth + "px");
			if(newContentWidth > this.contentMinWidth){
				$('#' + this.options.id + '_content_left_bottom').css('display','block');
				$('#' + this.options.id + '_content_left_sum_bottom').css('bottom',16);
			}else{
				$('#' + this.options.id + '_content_left_bottom').css('display','none');
				$('#' + this.options.id + '_content_left_sum_bottom').css('bottom',0);
			}
			return newContentWidth;
		},
		/*
		 * 获取某列对应属性
		 */
		getColumnAttr: function(attr, field) {
			for (var i = 0; i < this.gridCompColumnArr.length; i++) {
				if (this.gridCompColumnArr[i].options.field == field) {
					return $(this.gridCompColumnArr[i].options).attr(attr);
				}
			}
			return "";
		},

		/*
		 * 根据field获取gridcompColumn对象
		 */
		getColumnByField: function(field){
			for (var i = 0; i < this.gridCompColumnArr.length; i++) {
				if (this.gridCompColumnArr[i].options.field == field) {
					return this.gridCompColumnArr[i];
				}
			}
			return null;
		},

		/*
		 * 获取column属于第几列
		 */
		getIndexOfColumn:function(column){
			var index = -1;
			for(var i=0;i < this.gridCompColumnArr.length;i++){
				if(this.gridCompColumnArr[i] == column){
					index = i;
					break;
				}
			}
			return index;
		},
		/*
		 * 获取column属于当前显示第几列
		 */
		getVisibleIndexOfColumn:function(column){
			var index = -1;
			var j = 0;
			for(var i=0;i < this.gridCompColumnArr.length;i++){
				if(this.gridCompColumnArr[i] == column){
					if(!($('#' + this.options.id + '_header').find('th').eq(i).css('display') == 'none')){
						index = j;
					}
					break;
				}
				if(!($('#' + this.options.id + '_header').find('th').eq(i).css('display') == 'none')){
					j++;
				}
			}
			return index;
		},
		/*
		 * 获取column后面第一个显示列所在第几列
		 */
		getNextVisibleInidexOfColumn:function(column){
			var index = -1;
			var flag = false;
			var j = 0;
			for(var i=0;i < this.gridCompColumnArr.length;i++){
				if(this.gridCompColumnArr[i] == column){
					flag = true;
					continue;
				}
				if(flag == true && !($('#' + this.options.id + '_header').find('th').eq(i).css('display') == 'none')){
					index = j;
					break;
				}
				if(!($('#' + this.options.id + '_header').find('th').eq(i).css('display') == 'none')){

					j++;
				}
			}
			return index;
		},

		/*
		 * 修改第一列的css
		 */
		headerFirstClassFun:function(){
			$('#' + this.options.id + '_grid .u-grid-header-th-first').removeClass('u-grid-header-th-first');
			$('#' + this.options.id + '_grid').find('th').eq(0).addClass('u-grid-header-th-first');
		},
		/*
		 * 双击/单击处理
		 */
		isDblEvent:function(eventname,dbFun,dbArg,Fun,Arg){
			if (this.currentEventName != null && this.currentEventName == eventname){
				dbFun.call(this,dbArg);
				this.currentEventName = null;
				if (this.cleanCurrEventName)
					clearTimeout(this.cleanCurrEventName);
			}else{
				var oThis = this;
				if (this.cleanCurrEventName)
					clearTimeout(this.cleanCurrEventName);
				this.currentEventName = eventname;
				this.cleanCurrEventName =  setTimeout(function(){
					oThis.currentEventName = null;
					Fun.call(oThis,Arg);
				},500);
			}
		},

		/*
		 * 双击处理
		 */
		dblClickFun:function(e){
			if(typeof this.options.onDblClickFun == 'function'){
				var $tr = $(e.target).closest('tr');
				if($tr[0].id == this.options.id + '_edit_tr'){
					return;
				}
				var index = 0;
				if($tr.length > 0){
					index = this.getTrIndex($tr);
				}
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[index];
				obj.rowIndex = index;
				this.options.onDblClickFun(obj);
			}
		},

		/*
		 * 单击处理
		 */
		clickFun:function(e){

			var oThis = this;
			// 处理树表展开/合上
			var $target = $(e.target);
			var $td = $target.closest('td');
			var colIndex = $td.index()
			if($td.length > 0){
				var $tr = $td.parent();
				var index = this.getTrIndex($tr);
				var row = oThis.dataSourceObj.rows[index];
				if(row){
					var rowChildIndex = row.childRowIndex;
					if($target.hasClass('fa-minus-square-o') || $target.hasClass('fa-plus-square-o') ){
						var minus = $td.find('.fa-minus-square-o');
						var plus = $td.find('.fa-plus-square-o');
						if(minus.length >0){
							// 合上 需要将所有的都合上
							minus.removeClass('fa-minus-square-o').addClass('fa-plus-square-o');
							if(rowChildIndex.length > 0){
								var allChildRowIndex = oThis.getAllChildRowIndex(row);
								$.each(allChildRowIndex, function() {
									var $tr1 = $('tr[role="row"]:eq(' + parseInt(this) +')',$tr.parent());
									$tr1.css('display','none');
									// 左侧复选区隐藏
									$('#' + oThis.options.id + '_content_multiSelect >div:nth-child('+(parseInt(this) +1)+ ')').css('display','none');
									$('.fa-minus-square-o',$tr1).removeClass('fa-minus-square-o').addClass('fa-plus-square-o');
								});
							}
							if(this.options.editType == 'form'){
								$('#' + this.options.id + '_multiSelect_edit').remove(null,true);
								$('#' + this.options.id + '_numCol_edit').remove(null,true);
								$('#' + this.options.id + '_edit_tr').remove(null,true);
								$('#' + this.options.id + '_edit_tr1').remove(null,true);
							}
							return;
						}else if(plus.length > 0){
							// 展开
							plus.removeClass('fa-plus-square-o').addClass('fa-minus-square-o');
							if(rowChildIndex.length > 0){
								$.each(rowChildIndex, function() {
									var $tr1 = $('tr[role="row"]:eq(' + parseInt(this) +')',$tr.parent());
									$tr1.css('display','');
									var ss = $('#' + oThis.options.id + '_content_multiSelect >div:nth-child('+(parseInt(this) +1)+ ')')[0];
									$('#' + oThis.options.id + '_content_multiSelect >div:nth-child('+(parseInt(this) +1)+ ')').css('display','');
								});
							}
							return;
						}
					}
				}
			}

			// 处理focus事件
			var $tr = $(e.target).closest('tr');
			if($tr.length > 0 && $tr[0].id == this.options.id + '_edit_tr'){
				return;
			}
			if($tr.length > 0){
				var index = this.getTrIndex($tr);
				var row = oThis.dataSourceObj.rows[index];
				if(row){
					if(oThis.options.rowClickBan){
						return;
					}

					var rowChildIndex = row.childRowIndex;

					if(oThis.dataSourceObj.rows[index].focus && oThis.options.cancelFocus){
						oThis.setRowUnFocus(index);
					}else{
						if(!oThis.dataSourceObj.rows[index].focus){
							oThis.setRowFocus(index);
						}
					}

					if(oThis.options.editable && (oThis.eidtRowIndex != index || (oThis.options.editType == 'default' && oThis.editColIndex != colIndex))){
						oThis.editRowFun($tr,colIndex);
					}
				}
			}
		},
		/*
		 * 设置某列是否显示(传入column)
		 */
		setColumnVisibleByColumn:function(column,visible){
			var index = this.getIndexOfColumn(column);
			this.setColumnVisibleByIndex(index,visible);
		},

		/*
		 * 设置某列是否显示(传入index为gridCompColumnArr中的数据)
		 */
		setColumnVisibleByIndex:function(index,visible){
			if(index >= 0){
				var column = this.gridCompColumnArr[index];
				var visibleIndex = this.getVisibleIndexOfColumn(column);
				// 显示处理
				if(column.options.visible == false && visible){
					var htmlStr = '<col';
					if (column.options.width) {
						htmlStr += ' style="width:' + this.formatWidth(column.options.width) + '"';
					}
					htmlStr += '>';

					$('#' + this.options.id + '_header th:eq(' + index + ')').css('display', "");
					$('#' + this.options.id + '_content th:eq(' + index + ')').css('display', "");
					$('td:eq(' + index + ')',$('#' + this.options.id + '_content tbody tr')).css('display', "");
					// 当前列之后的显示列的index
					var nextVisibleIndex = this.getNextVisibleInidexOfColumn(column);
					if(nextVisibleIndex == -1){
						// 添加在最后面
						try{
							$('#' + this.options.id + '_header col:last')[0].insertAdjacentHTML('afterEnd',htmlStr);
							$('#' + this.options.id + '_content col:last')[0].insertAdjacentHTML('afterEnd',htmlStr);
						}catch(e){
							$('#' + this.options.id + '_header col:last').after(htmlStr);
							$('#' + this.options.id + '_content col:last').after(htmlStr);
						}
					}else{
						// 添加在下一个显示列之前
						try{
							$('#' + this.options.id + '_header col:eq(' + (nextVisibleIndex) + ')')[0].insertAdjacentHTML('beforeBegin',htmlStr);
							$('#' + this.options.id + '_content col:eq(' + (nextVisibleIndex) + ')')[0].insertAdjacentHTML('beforeBegin',htmlStr);
						}catch(e){
							$('#' + this.options.id + '_header col:eq(' + (nextVisibleIndex) + ')').before(htmlStr);
							$('#' + this.options.id + '_content col:eq(' + (nextVisibleIndex) + ')').before(htmlStr);
						}
					}
					var newContentW = this.contentWidth + column.options.width;
				}
				// 隐藏处理
				if(column.options.visible == true && !visible){
					$('#' + this.options.id + '_header th:eq(' + index + ')').css('display', "none");
					$('#' + this.options.id + '_header col:eq(' + visibleIndex + ')').remove();
					$('#' + this.options.id + '_content th:eq(' + index + ')').css('display', "none");
					$('#' + this.options.id + '_content col:eq(' + visibleIndex + ')').remove();
					$('td:eq(' + index + ')',$('#' + this.options.id + '_content tbody tr')).css('display', "none");

					// 隐藏之后需要判断总体宽度是否小于内容区最小宽度，如果小于需要将最后一列进行扩展
					var newContentW = this.contentWidth - column.options.width;
				}
				column.options.visible = visible;
				this.columnsVisibleFun();
				var w = this.contentWidthChange(newContentW);
				this.lastVisibleColumn.options.width = this.lastVisibleColumnWidth;
				this.contentWidth = w;
				this.resetThVariable();
				this.saveGridCompColumnArrToLocal();
			}
		},		/*
		 * 拖动开始
		 */
		dragStart: function(e) {
			this.dragFlag = true;
			this.dragW = null;
			this.dragStartX = e.clientX;
		},
		/*
		 * 改变列宽度处理
		 */
		dragFun: function(e) {
			if (this.dragFlag) {
				var nowTh = $('#' + this.options.id + '_resize_handle')[0].nowTh,
					$nowTh = $(nowTh),
					nowThIndex = $nowTh.attr('index'),
					column = this.gridCompColumnArr[nowThIndex];
					nowVisibleThIndex = this.getVisibleIndexOfColumn(column);
				if (nowTh && column != this.lastVisibleColumn) {
					this.dragEndX = e.clientX;
					var changeWidth = this.dragEndX - this.dragStartX,
						newWidth = nowTh.attrWidth + changeWidth;
						cWidth = this.contentWidth + changeWidth;
					if (newWidth > this.minColumnWidth) {
						this.dragW = this.contentWidthChange(cWidth);
						$('#' + this.options.id + '_header_table col:eq(' + nowVisibleThIndex + ')').css('width', newWidth + "px");
						$('#' + this.options.id + '_content_table col:eq(' + nowVisibleThIndex + ')').css('width', newWidth + "px");

						column.options.width = newWidth;
					}
				}
				$('#' + this.options.id + '_top').css('display', 'block');
			}
		},
		/*
		 * 拖动结束
		 */
		dragEnd: function(e) {
			if (this.dragFlag) {
				this.resetThVariable();
				this.saveGridCompColumnArrToLocal();
			}
			this.lastVisibleColumn.options.width = this.lastVisibleColumnWidth;
			if(this.dragW)
				this.contentWidth = this.dragW;
			$('#' + this.options.id + '_resize_handle')[0].nowTh = null;
			this.dragFlag = false;
			$('#' + this.options.id + '_top').css('display', 'none');
		},
		/*
		 * 计算拖动div所在位置
		 */
		headerThDrag: function(e, ele) {
			if (!this.dragFlag && !this.swapColumnFlag && ele && ele.gridCompColumn && ele.gridCompColumn.options.canDrag && $('#' + this.options.id + '_resize_handle')[0].nowTh != ele) {
				var $ele = $(ele);
				$('#' + this.options.id + '_resize_handle').css('left', ele.attrRightTotalWidth - this.scrollLeft - 4 + this.leftW + this.fixedWidth);
				$('#' + this.options.id + '_resize_handle')[0].nowTh = ele;
			}
		},		/*
		 * 交换列位置开始，并不修改swapColumnFlag，当移动的时候才修改swapColumnFlag
		 */
		swapColumnStart: function(e, ele) {
			if(!this.canSwap){
				return;
			}
			this.swapColumnEle = ele;
			this.swapColumnStartX = e.clientX;
			this.swapColumnStartY = e.clientY;
		},
		/*
		 * 交换位置
		 */
		swapColumnFun: function(e) {
			if(!this.canSwap){
				return;
			}
			var oThis = this;
			if (this.swapColumnFlag) {
				var nowTh = this.swapColumnEle,
					$nowTh = $(nowTh),
					nowGridCompColumn = nowTh.gridCompColumn;
				//创建拖动区域
				if ($('#' + this.options.id + '_clue').length == 0) {
					var $d = $('<div class="u-grid u-grid-header-drag-clue" id="' + this.options.id + '_clue" />').css({
						width: nowTh.scrollWidth + "px",
						left: nowTh.attrLeftTotalWidth - oThis.scrollLeft + oThis.leftW +oThis.fixedWidth + "px",
						top: "0px",
						paddingLeft: $nowTh.css("paddingLeft"),
						paddingRight: $nowTh.css("paddingRight"),
						lineHeight: $nowTh.height() + "px",
						paddingTop: $nowTh.css("paddingTop"),
						paddingBottom: $nowTh.css("paddingBottom")
					}).html(nowGridCompColumn.options.title || nowGridCompColumn.options.field).prepend('<span class="fa fa-ban u-grid-header-drag-status" />');
					$('#' + this.options.id)[0].insertAdjacentElement('afterBegin',$d[0]);
					$d.on('mousemove',function(){
						e.stopPropagation();
					});
				}
				this.swapColumnEndX = e.clientX;
				this.swapColumnEndY = e.clientY;
				var changeX = this.swapColumnEndX - this.swapColumnStartX,
					changeY = this.swapColumnEndY - this.swapColumnStartY;
				$('#' + this.options.id + '_clue').css({
					left: nowTh.attrLeftTotalWidth + changeX - oThis.scrollLeft + oThis.leftW + oThis.fixedWidth + "px",
					top: changeY + "px"
				});

				// 创建提示div
				if ($('#' + this.options.id + '_swap_top').length == 0) {
					var $d = $('<span class="fa fa-sort-desc u-grid-header-swap-tip-span"  id="' + this.options.id + '_swap_top"/>');
					$d.css({
						top: $nowTh.height() - 6 + 'px'
					});
					var $d1 = $('<span class="fa fa-sort-asc u-grid-header-swap-tip-span" id="' + this.options.id + '_swap_down" />');
					$d1.css({
						top: '6px'
					});
					$('#' + this.options.id)[0].insertAdjacentElement('afterBegin',$d[0]);
					$('#' + this.options.id)[0].insertAdjacentElement('afterBegin',$d1[0]);
				}
				this.canSwap = false;
				$('#' + this.options.id + '_header_table th').each(function(i) {
					var left = $(this).offset().left,
						right = left + parseInt(this.attrWidth);
					if (i == 0 && e.clientX < left) {
						// 移动到最左边
						if (oThis.swapColumnEle != this) {
							oThis.swapToColumnEle = 'LeftEle';
							$('#' + oThis.options.id + '_swap_top').css({
								left: -oThis.scrollLeft - 3 + oThis.leftW +oThis.fixedWidth + 'px',
								display: 'block'
							});
							$('#' + oThis.options.id + '_swap_down').css({
								left: -oThis.scrollLeft - 3 + oThis.leftW + oThis.fixedWidth + 'px',
								display: 'block'
							});
						}
						oThis.canSwap = true;
					} else if (left < e.clientX && e.clientX < right) {
						if (oThis.swapColumnEle != this && parseInt($(this).attr('index')) + 1 != parseInt($(oThis.swapColumnEle).attr('index'))) {
							if (oThis.swapToColumnEle != this) {
								oThis.swapToColumnEle = this;
								$('#' + oThis.options.id + '_swap_top').css({
									left: this.attrRightTotalWidth - oThis.scrollLeft - 3 + oThis.leftW  + oThis.fixedWidth + 'px',
									display: 'block'
								});
								$('#' + oThis.options.id + '_swap_down').css({
									left: this.attrRightTotalWidth - oThis.scrollLeft - 3 + oThis.leftW + oThis.fixedWidth + 'px',
									display: 'block'
								});
							}
							oThis.canSwap = true;
							return false;
						}
					}
				});
				if (this.canSwap) {
					$('.u-grid-header-drag-status').removeClass('fa-ban').addClass('fa-plus-circle');
				} else {
					$('#' + this.options.id + '_swap_top').css('display', 'none');
					$('#' + this.options.id + '_swap_down').css('display', 'none');
					$('.u-grid-header-drag-status').removeClass('fa-plus-circle').addClass('fa-ban');
					this.swapToColumnEle = null;
				}
				$('#' + this.options.id + '_top').css('display', 'block');
			}
		},
		/*
		 * 交换位置结束
		 */
		swapColumnEnd: function(e) {
			if(!this.canSwap){
				return;
			}
			var oThis = this;
			if (this.swapColumnFlag) {
				if (this.swapToColumnEle) {
					var swapColumnEle = this.swapColumnEle,
						swapToColumnEle = this.swapToColumnEle,
						swapColumnIndex = $(swapColumnEle).attr('index'),
						swapToColumnIndex = $(swapToColumnEle).attr('index'),
						swapGridCompColumn = this.gridCompColumnArr[swapColumnIndex];
					this.gridCompColumnArr.splice(parseInt(swapToColumnIndex) + 1, 0, swapGridCompColumn);
					if (swapColumnIndex < swapToColumnIndex)
						this.gridCompColumnArr.splice(swapColumnIndex, 1);
					else
						this.gridCompColumnArr.splice(parseInt(swapColumnIndex) + 1, 1);
					this.saveGridCompColumnArrToLocal();
					this.repaintGridDivs();
				}
				$('#' + this.options.id + '_clue').remove();
				$('#' + this.options.id + '_swap_top').css('display', 'none');
				$('#' + this.options.id + '_swap_down').css('display', 'none');
			}
			this.swapColumnFlag = false;
			$('#' + this.options.id + '_top').css('display', 'none');
		},		/*
		 * 处理排序
		 */
		canSortable: function(e, ele) {
			var oThis = this,
				$ele = $(ele),
				field = $ele.attr('field'),
				sortable = this.getColumnAttr('sortable', field);
			if (sortable) {
				if(e.ctrlKey) {
					// 构建排序信息的数据结构
					var prioArray = []
					$('.u-grid-header-sort-priority').each(function(index, domEle){
						var $el = $(domEle)
						var p = parseInt($el.text())
						var f = $el.closest('th').attr('field')
						var st
						if($el.parent().hasClass("fa-angle-up")) {
							st = 'asc'
						} else if($el.parent().hasClass("fa-angle-down")){
							st = 'desc'
						}
						prioArray[p-1] = {field:f, sortType:st}
					})
					// 页面调整
					var $angle
					if(($angle = $ele.find('.fa-angle-up')).length > 0) {
						var p = parseInt($angle.find('.u-grid-header-sort-priority').text())
						prioArray[p-1].sortType = 'desc'
						$angle.removeClass('fa-angle-up').addClass('fa-angle-down')
					} else if(($angle = $ele.find('.fa-angle-down')).length > 0) {
						var p = parseInt($angle.find('.u-grid-header-sort-priority').text())
						for(var i=p;i<prioArray.length;i++) {
							var $flag = $('[field='+prioArray[i].field+']').find('.u-grid-header-sort-priority')
							$flag.text(parseInt($flag.text())-1)
						}
						prioArray.splice(p-1,1)
						$angle.remove()
					} else {
						prioArray.push({field:field, sortType:'asc'})
						$ele.first().append('<span class="fa fa-angle-up u-grid-header-sort-span" ><span class="u-grid-header-sort-priority">'+prioArray.length+'</span></span>')
					}
					// 执行排序逻辑
					this.dataSourceObj.sortRowsByPrio(prioArray)

				} else {
					if ($(".fa-angle-up").parent().parent()[0] == ele) { //原来为升序，本次为降序
						$(".fa-angle-up").remove();
						$(ele.firstChild)[0].insertAdjacentHTML('beforeEnd','<span class="fa fa-angle-down u-grid-header-sort-span" ><span class="u-grid-header-sort-priority">1</span></span>');
						if(typeof this.options.onSortFun == 'function'){
							this.options.onSortFun(field,'asc')
						}else{
							this.dataSourceObj.sortRows(field, "asc");
						}
					} else if ($(".fa-angle-down").parent().parent()[0] == ele) { //原来为降序，本次为不排序
						$(".fa-angle-down").remove();
						if(typeof this.options.onSortFun == 'function'){
							this.options.onSortFun();
						}else{
							this.dataSourceObj.sortRows();
						}

					} else { //本次为升序
						$(".fa-angle-up").remove();
						$(".fa-angle-down").remove();
						$(ele.firstChild)[0].insertAdjacentHTML('beforeEnd','<span class="fa fa-angle-up u-grid-header-sort-span"><span class="u-grid-header-sort-priority">1</span></span>');
						if(typeof this.options.onSortFun == 'function'){
							this.options.onSortFun(field, "desc");
						}else{
							this.dataSourceObj.sortRows(field, "desc");
						}

					}
				}

				oThis.repairContent();
				oThis.afterGridDivsCreate();
			}
		},
		editRowFun:function($tr, colIndex){
			if(this.eidtRowIndex != -1){
				this.editClose();
			}
			var index = typeof $tr === 'number' ? $tr : this.getTrIndex($tr);
			this.eidtRowIndex = index;
			this.editColIndex = colIndex;
			this.editRow($tr, colIndex);
		},
		editRowIndexFun:function(i){
			if(this.eidtRowIndex != -1){
							this.editClose();
						}
			this.eidtRowIndex = i;
			this.editColIndex = 0;
			this.editRow();
		},

		/*
		 * 创建编辑行
		 */
		editRow:function($tr,colIndex){
			var oThis = this;
			var isFixedCol = false
			if ($tr && $tr.parents('table').attr('id').indexOf('_fixed_') > -1)
				isFixedCol = true
			$tr = $tr || $('#' + this.options.id + '_content_tbody tr[role="row"]:eq(' + this.eidtRowIndex+ ')');
			colIndex = colIndex || 0
//			var $fixedtr = $('#' + this.options.id + '_content_fixed_tbody tr[role="row"]:eq(' + this.eidtRowIndex+ ')');
			var row = this.dataSourceObj.rows[this.eidtRowIndex].value;
			this.editRowObj = this.cloneObj(row);
			if(this.options.editType == 'default'){
				var column = isFixedCol ? this.gridCompColumnFixedArr[colIndex] : this.gridCompColumnArr[colIndex]
//				$.each(this.gridCompColumnArr, function(i) {
					if(column.options.editable){
						var td = $('td:eq(' + colIndex + ')',$tr)[0];
						var field = column.options.field;
						var value = $(row).attr(field);
						value = oThis.getString(value,'');
						oThis.editCell(td,value,field,column.options.editType,oThis.editRowObj);
					}
//				});
//				$.each(this.gridCompColumnFixedArr, function(i) {
//					if(this.options.editable){
//						var td = $('td:eq(' + i + ')',$fixedtr)[0];
//						var field = this.options.field;
//						var value = $(row).attr(field);
//						value = oThis.getString(value,'');
//						oThis.editCell(td,value,field,this.options.editType,oThis.editRowObj);
//					}
//				});
				$('#' +this.options.id + '_content_edit_menu').css('display','block');
	//			$('#' +this.options.id + '_content_edit_menu').css('left',this.leftW + this.fixedWidth + 'px');
				//$('#' +this.options.id + '_content_edit_menu').css('left',this.leftW + 'px');
				$('#' +this.options.id + '_content_edit_menu_cancel').css('marginLeft','10px');// 与form形式相比偏左
				var topIndex = $('tr:visible',$tr.parent()).index($tr);
				this.rowHeight = $tr.height(); // tianxq
				var t = this.rowHeight * (topIndex + 1) + this.headerHeight + 1;
				//$('#' +this.options.id + '_content_edit_menu').css('top',t + 'px');
			}else if(this.options.editType == 'form'){
				if(typeof this.options.formEditRenderFun == 'function'){
					if(this.fixedWidth>0){
						var table = $('#' + this.options.id + '_content_fixed_table')[0];
					}else{
						var table = $('#' + this.options.id + '_content_table')[0];
					}

					var tr = table.insertRow(this.eidtRowIndex + 2);
					tr.id = this.options.id + '_edit_tr';
					var cell = tr.insertCell();
					cell.id = this.options.id + '_edit_td';
					cell.style.borderBottom = '0px';
					var cWidth = parseInt(this.contentMinWidth) + parseInt(this.fixedWidth);
					var htmlStr = '<div id="' + this.options.id + '_edit_form" class="u-grid-edit-form" style="width:' + cWidth + 'px;float:left;">';
					htmlStr += '</div>';
					cell.innerHTML = htmlStr;
					var obj = {};
					obj.grid = gridObj;
					obj.element = $('#' + this.options.id + '_edit_form')[0];
					obj.editRowObj = this.editRowObj;
					this.options.formEditRenderFun.call(this,obj);
					var htmlStr = '<div style="position:relative;float:left;width:100%;height:40px;"></div>';
					$('#' + this.options.id + '_edit_form')[0].insertAdjacentHTML('beforeEnd',htmlStr);
//					var h = $('#' + this.options.id + '_edit_td')[0].offsetHeight;
//					h += 40;
//					tr.style.height = h + 'px';
//					$('#' + this.options.id + '_edit_form')[0].style.height = h + 'px';
					var h = $('#' + this.options.id + '_edit_td')[0].offsetHeight;
					var color = $('#' + this.options.id + '_edit_form').css('background-color');
					if(this.options.multiSelect){
						var $div = $('#' + this.options.id + '_content_multiSelect > div').eq( this.eidtRowIndex );
						var htmlStr = '<div class="grid_open_edit" id="' + this.options.id + '_multiSelect_edit" style="background-color:'+color+';float:left;position:relative;width:' + this.multiSelectWidth + 'px;height:'+ h +'px"></div>';
						$div[0].insertAdjacentHTML('afterEnd',htmlStr);
					}
					if(this.options.showNumCol){
						var $div = $('#' + this.options.id + '_content_numCol > .u-grid-content-num').eq( this.eidtRowIndex );
						var htmlStr = '<div id="' + this.options.id + '_numCol_edit" style="background-color:'+color+';float:left;position:relative;width:' + this.numWidth + 'px;"></div>';
						$div[0].insertAdjacentHTML('afterEnd',htmlStr);
					}
					$('#' +this.options.id + '_content_edit_menu').css('display','block');


					if(this.fixedWidth>0){
						var table1 = $('#' + this.options.id + '_content_table')[0];
						var tr1 = table1.insertRow(this.eidtRowIndex + 2);
						tr1.id = this.options.id + '_edit_tr1';
//						tr1.style.height = h + 'px';
					}
				}else{
					if(this.fixedWidth>0){
						var table = $('#' + this.options.id + '_content_fixed_table')[0];
					}else{
						var table = $('#' + this.options.id + '_content_table')[0];
					}

					var tr = table.insertRow(this.eidtRowIndex + 2);
					tr.id = this.options.id + '_edit_tr';
					var cell = tr.insertCell();
					cell.id = this.options.id + '_edit_td';
					cell.style.borderBottom = '0px';
					var cWidth = parseInt(this.contentMinWidth) + parseInt(this.fixedWidth);
					var htmlStr = '<div id="' + this.options.id + '_edit_form" class="u-grid-edit-form" style="width:' + cWidth + 'px;float:left;">';
					$.each(this.gridCompColumnFixedArr, function(i) {
						var show = false;
						if(this.options.editFormShow && (this.options.editable || (!this.options.editable && oThis.options.noneEditableFormShow) ) ) {
							show = true;
						}

						if(show){
							var field = this.options.field;
							var value = $(row).attr(field);
							value = oThis.getString(value,'');
							var title = this.options.title;
							htmlStr += oThis.formEditCell(value,field,title,this.options.required);
						}
					});

					$.each(this.gridCompColumnArr, function(i) {
						var show = false;
						if(this.options.editFormShow && (this.options.editable || (!this.options.editable && oThis.options.noneEditableFormShow) ) ) {
							show = true;
						}

						if(show){
							var field = this.options.field;
							var value = $(row).attr(field);
							value = oThis.getString(value,'');
							var title = this.options.title;
							htmlStr += oThis.formEditCell(value,field,title,this.options.required);
						}
					});
					htmlStr += '</div>';
					cell.innerHTML = htmlStr;

					$.each(this.gridCompColumnFixedArr, function(i) {
						var show = false;
						if(this.options.editFormShow && (this.options.editable || (!this.options.editable && oThis.options.noneEditableFormShow) ) ) {
							show = true;
						}

						if(show){
							var field = this.options.field;
							var td = $('#' + oThis.options.id + '_edit_' + field)[0];
							var value = $(row).attr(field);
							var title = this.options.title;
							value = oThis.getString(value,'');
							htmlStr += oThis.editCell(td,value,field,this.options.editType,oThis.editRowObj);
						}
					});

					$.each(this.gridCompColumnArr, function(i) {
						var show = false;
						if(this.options.editFormShow && (this.options.editable || (!this.options.editable && oThis.options.noneEditableFormShow) ) ) {
							show = true;
						}

						if(show){
							var field = this.options.field;
							var td = $('#' + oThis.options.id + '_edit_' + field)[0];
							var value = $(row).attr(field);
							var title = this.options.title;
							value = oThis.getString(value,'');
							htmlStr += oThis.editCell(td,value,field,this.options.editType,oThis.editRowObj);
						}
					});

					if(typeof(this.options.renderEditMemu) == "function"){

						this.options.renderEditMemu.apply(this,[$('#' + this.options.id + '_edit_form')[0],this.eidtRowIndex,this.dataSourceObj.rows.length])
					}else{
						var htmlStr = '<div id="'+ this.options.id+'_content_edit_menu" style="position:relative;float:left;width:100%;height:40px;"><button type="button" class="u-grid-content-edit-menu-button u-grid-content-edit-menu-button-ok" id="' + this.options.id + '_content_edit_menu_close">' + this.transMap.ml_close + '</button></div>';

						$('#' + this.options.id + '_edit_form')[0].insertAdjacentHTML('beforeEnd',htmlStr);
						$('#' + this.options.id + '_content_edit_menu_close').on('click',function(e){
							oThis.editClose();
						});
					}
					// 处理左侧区域位置
					var h = $('#' + this.options.id + '_edit_td')[0].offsetHeight;
					var color = $('#' + this.options.id + '_edit_form').css('background-color');
					if(this.options.multiSelect){
						var $div = $('#' + this.options.id + '_content_multiSelect > div').eq( this.eidtRowIndex );
						var htmlStr = '<div class="grid_open_edit " id="' + this.options.id + '_multiSelect_edit" style="background-color:'+color+';float:left;position:relative;width:' + this.multiSelectWidth + 'px;height:'+ h +'px"></div>';
						$div[0].insertAdjacentHTML('afterEnd',htmlStr);
					}
					if(this.options.showNumCol){
						var $div = $('#' + this.options.id + '_content_numCol > .u-grid-content-num').eq( this.eidtRowIndex );
						var htmlStr = '<div id="' + this.options.id + '_numCol_edit" style="background-color:'+color+';float:left;position:relative;width:' + this.numWidth + 'px;"></div>';
						$div[0].insertAdjacentHTML('afterEnd',htmlStr);
					}
					$('#' +this.options.id + '_content_edit_menu').css('display','block');


					if(this.fixedWidth>0){
						var table1 = $('#' + this.options.id + '_content_table')[0];
						var tr1 = table1.insertRow(this.eidtRowIndex + 2);
						tr1.id = this.options.id + '_edit_tr1';
//						tr1.style.height = h + 'px';
					}
				}

			}
		},

		/*
		 * 行编辑关闭
		 */
		editClose:function(){
//			var tr = $('#' + this.options.id + '_content_tbody').find('tr[role="row"]')[ this.eidtRowIndex];
//			var fixedtr = $('#' + this.options.id + '_content_fixed_tbody').find('tr[role="row"]')[this.eidtRowIndex];
			var row = this.dataSourceObj.rows[this.eidtRowIndex];
			if(!row)
				return;

			// try{
				// form 编辑态现在不需要重画
				if(this.options.editType != 'form'){
					this.repaintRow(this.eidtRowIndex);
				}
			// }catch(e){
				// var table = $('#' + this.options.id + '_content_table')[0];
				// var fixedtable = $('#' + this.options.id + '_content_fixed_table')[0];
				// table.deleteRow(this.eidtRowIndex + 1);
				// fixedtable.deleteRow(this.eidtRowIndex + 1);
				// this.createContentOneRowForIE(table,this.eidtRowIndex,row);
				// this.createContentOneRowForIE(fixedtable,this.eidtRowIndex,row,'fixed');
			// }

			$('#' +this.options.id + '_content_edit_menu').css('display','none');
			this.repairSumRow();
			this.noRowsShowFun();
			this.updateLastRowFlag();
			this.eidtRowIndex = -1;
			// form形式删除对应区域
			if(this.options.editType == 'form'){
				$('#' + this.options.id + '_multiSelect_edit').remove(null,true);
				$('#' + this.options.id + '_numCol_edit').remove(null,true);
				$('#' + this.options.id + '_edit_tr').remove(null,true);
				$('#' + this.options.id + '_edit_tr1').remove(null,true);
			}
		},

		/*
		 * 编辑单元格
		 */
		editCell:function(td,value,field,editType,rowObj){
			var oThis = this;
			if(editType == 'text'){
				// tianxq begin
				if(this.options.editType == 'default'){
					td.innerHTML = '<input id="' + this.options.id + "_edit_field_" + field + '" type="text" value="' + value +'" field="' + field+'" style="width:100%;margin:0px;min-height:20px;font-size:12px;color:#444">';
				}else{
					td.innerHTML = '<input id="' + this.options.id + "_edit_field_" + field + '" type="text" value="' + value +'" field="' + field+'">';
				}
				// tianxq end
				$('input',$(td)).on('blur',function(){
//					$(rowObj).attr(field,this.value);
					oThis.editValueChange(field,this.value);
				});
			}else if(typeof editType == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.element = td;
				obj.value = value;
				obj.field = field;
				obj.rowObj = rowObj;
				editType.call(this,obj);
			}
			if (this.options.editType == 'default')
				$('input',$(td)).focus()

		},

		editValueChange:function(field,value){
			// 设置row的值为新值
			this.updateValueAt(this.eidtRowIndex,field,value);
		},

		/*
		 * form形式下编辑单元格
		 */
		formEditCell:function(value,field,title,required){
			// 创建lable
			var st = (title+'')
			if(st.lengthb() > 28) {
				st = st.substrCH(26)+'...'
			}
			var htmlStr = '<div class="u-grid-edit-whole-div"><div class="u-grid-edit-label"><div title="'+title+'">' + st + '<span style="color:red;' + (!required? 'display: none':'') + '" class="u-grid-edit-mustFlag">*</span></div></div>';			// 创建编辑区域
			htmlStr += '<div id="' + this.options.id + '_edit_' + field + '" class="u-grid-edit-div"></div>';
			htmlStr += '</div>';
			return htmlStr;
		},		/*
		 * 获取本地个性化存储的设置
		 */
		getLocalData:function(){
			return null; //暂时不用缓存
			if (window.localStorage == null)
				return null;
			if (this.$sd_storageData != null)
				return this.$sd_storageData;
			else{
				if (window.localStorage.getItem(this.localStorageId) == null){
					try{
						window.localStorage.setItem(this.localStorageId,"{}");
					}
					catch(e){
						return null;
					}
				}
				var storageDataStr = window.localStorage.getItem(this.localStorageId);
				if(typeof(JSON) == "undefined")
					this.$sd_storageData = eval("("+storageDataStr+")");
				else
					this.$sd_storageData = JSON.parse(storageDataStr);
				return this.$sd_storageData;
			}
		},
		/*
		 * 保存本地个性化存储的设置
		 */
		saveLocalData:function(){
			return null; //暂时不用缓存
			var oThis = this;
			if(this.saveSettimeout){
				clearTimeout(this.saveSettimeout);
			}
			this.saveSettimeout = setTimeout(function(){
				if (oThis.$sd_storageData == null || window.localStorage == null)
					return;
				var strogeDataStr = JSON.stringify(oThis.$sd_storageData);
				try{
					window.localStorage.setItem(oThis.localStorageId,strogeDataStr);
				}catch(e){

				}
			},200);
		},
		/*
		 * 清除本地个性化存储的设置
		 */
		clearLocalData:function(){
			return null; //暂时不用缓存
			if(this.saveSettimeout){
				clearTimeout(this.saveSettimeout);
			}
			window.localStorage.setItem(this.localStorageId,"{}");
			this.$sd_storageData = {};
		},
		/*
		 * 将数据列顺序保存至本地个性化存储
		 */
		saveGridCompColumnArrToLocal:function(){
			return null; //暂时不用缓存
			var defData = this.getLocalData();
			defData["gridCompColumnArr"] = this.gridCompColumnArr.concat(this.gridCompColumnFixedArr);
			this.saveLocalData();
		},
		/*
		 * 从本地个性化存储中取出数据列顺序
		 */
		getGridCompColumnArrFromLocal:function(){
			return null; //暂时不用缓存
			var defData = this.getLocalData();
			if (defData == null) return null;
			if(defData["gridCompColumnArr"] == null) return null;
			return defData["gridCompColumnArr"];
		},		/*
		 * 对宽度和高度进行处理
		 */
		formatWidth: function(w) { // 获得宽度
			if(w){
				return (w + "").indexOf("%") > 0 ? w : parseInt(w) + "px";
			}else{
				return '';
			}
		},
		/*
		 * 两个元素交换位置，要求传入参数e1在e2之前
		 */
		swapEle: function(e1, e2) {
			var n = e1.next(),
				p = e2.prev();
			e2.insertBefore(n);
			e1.insertAfter(p);
		},
		getString:function(value,defaultValue){
			if(value === null || value === undefined || value === 'null' || value === 'undefined' || value === ""){
				value = defaultValue;
			}
			if(iweb.browser.isIE8){
				return [value].join("");
			}else{
				return value + "";
			}
		},

		getInt:function(value,defaultValue){
			if(value === null || value === undefined || value === 'null' || value === 'undefined' || value === "" || Number.isNaN(value)){
				value = defaultValue;
			}
			return value;
		},

		getFloat:function(value,defaultValue){
			if(value === null || value === undefined || value === 'null' || value === 'undefined' || value === "" || Number.isNaN(value)){
				value = defaultValue;
			}
			return value;
		},

		/*
		 * 克隆对象
		 */
		 cloneObj:function(obj){
		    var o;
		    if(typeof obj == "object"){
		        if(obj === null){
		            o = null;
		        }else{
		            if(obj instanceof Array){
		                o = [];
		                for(var i = 0, len = obj.length; i < len; i++){
		                    o.push(this.cloneObj(obj[i]));
		                }
		            }else{
		                o = {};
		                for(var k in obj){
		                    o[k] = this.cloneObj(obj[k]);
		                }
		            }
		        }
		    }else{
		        o = obj;
		    }
		    return o;
		},


		/*
		 * 处理精度
		 */
		DicimalFormater:function(obj){
			var value = obj.value + '';
			var precision = obj.precision;

			for ( var i = 0; i < value.length; i++) {
				if ("-0123456789.".indexOf(value.charAt(i)) == -1)
					return "";
			}
			return this.checkDicimalInvalid(value, precision);
		},

		checkDicimalInvalid:function(value,precision){
			if (value == null || isNaN(value))
				return "";
			// 浮点数总位数不能超过10位
//			if (value.length > 15)
//				value = value.substring(0, 15);

			// 默认2位精度
//			if (precision == null || !isNumberOnly(precision))
//				precision = 2;
//			else
//				precision = parseInt(precision);
			var digit = parseFloat(value);
			var result = (digit * Math.pow(10, precision) / Math.pow(10, precision))
					.toFixed(precision);
			if (result == "NaN")
				return "";

			return result;
		},
		accAdd:function(v1,v2){
			var r1,r2,m;
			try{
				r1 = v1.toString().split('.')[1].length;
			}catch(e){
				r1 = 0;
			}
			try{
				r2 = v2.toString().split('.')[1].length;
			}catch(e){
				r2 = 0;
			}
			m = Math.pow(10,Math.max(r1,r2))
			return (v1 * m + v2 * m)/m;
		},
		getTrIndex:function($tr){
			return $('tr[id!="' + this.options.id +'_edit_tr"]',$tr.parent()).index($tr);
		},
		/*
		 * 设置数据源
		 */
		setDataSource: function(dataSource) {
			this.initDataSourceVariable();
			this.options.dataSource = dataSource;
			this.initDataSource();
			this.repairContent();
			this.afterGridDivsCreate();
		},

		/*
		 * 设置数据源 格式为：
		 * {
    		fields:['column1','column2','column3','column4','column5','column6'],
    		values:[["cl1","1","cl3","cl4","cl5","cl6"]
    				,["cl12","2","cl32","cl42","cl52","cl62"]
    				,["cl13","3","cl33","cl43","cl53","cl63"]
    				,["cl14","4","cl34","cl44","cl54","cl64"]
    				,["cl15","5","cl35","cl45","cl55","cl65"]
    				,["cl16","6","cl36","cl46","cl56","cl66"]
		    	]

			}
		 */
		setDataSourceFun1: function(dataSource){
			var dataSourceObj = {};
			if(dataSource.values){
				var valuesArr = new Array();
				$.each(dataSource.values, function() {
					if(dataSource.fields){
						var valueObj = {},value = this;
						$.each(dataSource.fields, function(j) {
							$(valueObj).attr(this,value[j])
						});
						valuesArr.push(valueObj);
					}
				});
			}
			$(dataSourceObj).attr('values',valuesArr);
			this.setDataSource(dataSourceObj);
		},
		/*
		 * 添加一行
		 */
		addOneRow:function(row,index){
			var oThis = this;
			var displayFlag = 'none';
			var rowObj = {};
			rowObj.value = row;
			var parentIndex;
			var parentChildLength = 0;
			var l = this.dataSourceObj.rows.length;
			var endFlag = false;
			if(this.showType == 'grid'){ //只有grid展示的时候才处理div，针对隐藏情况下还要添加数据
				if(this.eidtRowIndex != -1){
					this.editClose();
				}
				// 存在树结构
				if(this.options.showTree){
					var hasParent = false;
					var hasChildF = false;
					var keyField = this.options.keyField;
					var parentKeyField = this.options.parentKeyField;
					var keyValue = this.getString($(row).attr(keyField),'');
					var parentKeyValue = this.getString($(row).attr(parentKeyField),'');
					/* 判断是否存在父项/子项 */
					$.each(this.dataSourceObj.rows,function(i){
						var value = this.value;
						var nowKeyValue = oThis.getString($(value).attr(keyField),'');
						var nowParentKeyValue = oThis.getString($(value).attr(parentKeyField),'');
						if(nowKeyValue == parentKeyValue){
							/* 取父项的index和父项的子index*/
							hasParent = true;
							parentIndex = i;
							parentChildLength = this.childRowIndex.length;
							var parentLevel = this.level;
							rowObj.level = parentLevel + 1;
							/*if(parentChildLength > 0){
								var lastChildIndex = this.childRowIndex[parentChildLength - 1];
								index = lastChildIndex + 1;
							}else{
								index = parentIndex + 1;
							}*/
							// 由于不止需要计算最后一个子节点，同时需要计算子节点的子节点。所以现在添加到父节点的下面一个
							index = parentIndex + 1;
							this.allChildRowIndex = new Array();

						}
						if(nowParentKeyValue == keyValue){
							hasChildF = true;
						}
					});
					if(!hasParent){
						rowObj.level = 0;
						if(index != l) {
							// 如果没有父项则插入到最后，因为index有可能插入到其他节点的子节点之中，计算复杂
							index = 0;
						}

					}
				}

				if(index != 0){
					if(index && index > 0){
						if(l < index)
							index = l;
					}else{
						index = 0;
					}
				}
				if(l == index){
					endFlag = true;
				}
				rowObj.valueIndex = index;
				this.dataSourceObj.rows.splice(index,0,rowObj);
				this.updateEditRowIndex('+', index);
				// 如果是在中间插入需要将后续的valueIndex + 1；
				if(this.dataSourceObj.rows.length > (index + 1)){
					$.each(this.dataSourceObj.rows,function(i){
						if(i > index){
							this.valueIndex =  this.valueIndex + 1;
						}
					});
				}

				if(hasParent){
					var $pTr = $('#' + this.options.id + '_content_div').find('tbody').find('tr[role="row"]').eq(parentIndex);
					if(parentChildLength > 0){
						// 如果存在父项并且父项存在子项则需要判断父项是否展开
						var openDiv = $('.fa-plus-square-o',$pTr);
						if(!(openDiv.length > 0)){
							displayFlag = 'block';
						}
					}else{
						// 如果存在父项并且父项原来没有子项则需要添加图标
						displayFlag = 'block';
						var d = $("div:visible:eq(0)",$pTr);
						var openDiv = $('.fa-plus-square-o',$pTr);
						var closeDiv = $('.fa-minus-square-o',$pTr);
						var spanHtml = '<span class="fa u-grid-content-tree-span fa-minus-square-o"></span>';
						if(d.length > 0 && openDiv.length == 0 && closeDiv.length == 0){
							d[0].insertAdjacentHTML('afterBegin',spanHtml);
							var oldLeft = parseInt(d[0].style.left);
							l = oldLeft - 16;
							if(l > 0 || l == 0){
								d[0].style.left = l + "px";
							}
						}
						if(openDiv.length > 0){
							openDiv.removeClass('fa-plus-square-o').addClass('fa-minus-square-o');
						}
					}
				}
				try{

					var htmlStr = this.createContentOneRow(rowObj,'normal',displayFlag);
					if(endFlag){
						$('#' + this.options.id + '_content_div tbody')[0].insertAdjacentHTML('beforeEnd',htmlStr);
					}else{
						if($('#' + this.options.id + '_content_div').find('tbody').find('tr[role="row"]')[index])
							$('#' + this.options.id + '_content_div').find('tbody').find('tr[role="row"]')[index].insertAdjacentHTML('beforeBegin',htmlStr);
						else if($('#' + this.options.id + '_content_div tbody')[0])
							$('#' + this.options.id + '_content_div tbody')[0].insertAdjacentHTML('afterBegin',htmlStr);
					}

					var htmlStr = this.createContentOneRow(rowObj,'fixed',displayFlag);
					if(endFlag){
						$('#' + this.options.id + '_content_fixed_div tbody')[0].insertAdjacentHTML('beforeEnd',htmlStr);
					}else{
						if($('#' + this.options.id + '_content_fixed_div').find('tbody').find('tr[role="row"]')[index])
							$('#' + this.options.id + '_content_fixed_div').find('tbody').find('tr[role="row"]')[index].insertAdjacentHTML('beforeBegin',htmlStr);
						else if($('#' + this.options.id + '_content_fixed_div tbody')[0])
							$('#' + this.options.id + '_content_fixed_div tbody')[0].insertAdjacentHTML('afterBegin',htmlStr);
					}
				}catch(e){
					//IE情况下
					var table = $('#' + this.options.id + '_content_div table')[0];
					if(table)
						this.createContentOneRowForIE(table,index,rowObj,'normal',displayFlag);
					var fixedTable = $('#' + this.options.id + '_content_fixed_div table')[0];
					if(fixedTable)
						this.createContentOneRowForIE(fixedTable,index,rowObj,'fixed',displayFlag);
				}
				//
				if(this.options.multiSelect){
					var htmlStr = this.createContentLeftMultiSelectRow(rowObj,displayFlag);
					if(endFlag){
						$('#' + this.options.id + '_content_multiSelect')[0].insertAdjacentHTML('beforeEnd',htmlStr);
					}else{
						if($('#' + this.options.id + '_content_multiSelect').find('div')[index])
							$('#' + this.options.id + '_content_multiSelect').find('div')[index].insertAdjacentHTML('beforeBegin',htmlStr);
						else
							$('#' + this.options.id + '_content_multiSelect')[0].insertAdjacentHTML('afterBegin',htmlStr);
					}
				}
				if (this.options.showNumCol) {
					var htmlStr = this.createContentLeftNumColRow(l);
					if(endFlag){
						$('#' + this.options.id + '_content_numCol')[0].insertAdjacentHTML('beforeEnd',htmlStr);
					}else{
						if($('#' + this.options.id + '_content_numCol').find('div')[index])
							$('#' + this.options.id + '_content_numCol').find('div')[index].insertAdjacentHTML('beforeBegin',htmlStr);
						else
							$('#' + this.options.id + '_content_numCol')[0].insertAdjacentHTML('afterBegin',htmlStr);
					}

					this.resetNumCol();
					this.updateNumColLastRowFlag();
					
				}
				this.repairSumRow();
				this.noRowsShowFun();
				this.updateLastRowFlag();
//				var obj = {};
//				obj.begin = index;
//				obj.length = 1;
//				obj.createFlag = 'fixed';
//				this.renderTypeFun(obj);
				var obj = {};
				obj.begin = index;
				obj.length = 1;
				this.renderTypeFun(obj);
			}
			// 需要重新排序重置变量
			var l = 0;
			if(this.options.showTree){
				if(this.dataSourceObj.options.values){
					l = this.dataSourceObj.options.values.length;
				}else{
					this.dataSourceObj.options.values = new Array();
				}
				this.dataSourceObj.options.values.splice(index,0,row);
				this.dataSourceObj.sortRows();
				if(hasChildF){
					//如果存在子项则重新渲染整个区域
					this.repairContent();
				}
			}else{
				if(this.dataSourceObj.options.values){

				}else{
					this.dataSourceObj.options.values = new Array();
				}
				this.dataSourceObj.options.values.splice(index,0,row);
			}

		},

		/*
		 * 添加多行
		 */
		addRows:function(rows,index){
			if(this.options.showTree){
				// 树表待优化
				var l = rows.length;
				for(var i = l-1; i > -1;i--){
					this.addOneRow(rows[i],index);
				}
				return;
			}
			if(this.eidtRowIndex != -1){
				this.editClose();
			}
			var htmlStr = '',htmlStrmultiSelect='',htmlStrNumCol='',htmlStrFixed='',oThis = this,l = this.dataSourceObj.rows.length,endFlag = false;
			if(index != 0){
				if(index && index > 0){
					if(l < index)
						index = l;
				}else{
					index = 0;
				}
			}
			if(l == index){
				endFlag = true;
			}
			var rowObjArr = new Array();
			$.each(rows, function(i) {
				var rowObj = {};
				rowObj.value = this;
				rowObj.valueIndex = index + i;
				rowObjArr.push(rowObj);
				oThis.dataSourceObj.rows.splice(index + i,0,rowObj);
				oThis.updateEditRowIndex('+', index+i)
			});

			// 如果是在中间插入需要将后续的valueIndex + 1；
			if(this.dataSourceObj.rows.length > (index + rows.length)){
				$.each(this.dataSourceObj.rows,function(i){
					if(i > (index + rows.length - 1)){
						this.valueIndex =  this.valueIndex + rows.length;
					}
				});
			}

			if(this.showType == 'grid' && $('#' + this.options.id + '_content_div tbody')[0]){ //只有grid展示的时候才处理div，针对隐藏情况下还要添加数据 //lyk--需要完善隐藏之后再显示同事添加数据操作
				$.each(rowObjArr, function(i) {
					htmlStr += oThis.createContentOneRow(this);
					htmlStrFixed += oThis.createContentOneRow(this,'fixed');
					if(oThis.options.multiSelect){
						htmlStrmultiSelect += oThis.createContentLeftMultiSelectRow(this);
					}
					if(oThis.options.showNumCol){
						htmlStrNumCol += oThis.createContentLeftNumColRow(l + i);
					}
				});
				try{
					if(endFlag){
						$('#' + this.options.id + '_content_div tbody')[0].insertAdjacentHTML('beforeEnd',htmlStr);
					}else{
						if($('#' + this.options.id + '_content_div').find('tbody').find('tr[role="row"]')[index])
							$('#' + this.options.id + '_content_div').find('tbody').find('tr[role="row"]')[index].insertAdjacentHTML('beforeBegin',htmlStr);
						else if($('#' + this.options.id + '_content_div tbody')[0])
							$('#' + this.options.id + '_content_div tbody')[0].insertAdjacentHTML('afterBegin',htmlStr);
					}
					if(endFlag){
						$('#' + this.options.id + '_content_fixed_div tbody')[0].insertAdjacentHTML('beforeEnd',htmlStrFixed);
					}else{
						if($('#' + this.options.id + '_content_fixed_div').find('tbody').find('tr[role="row"]')[index])
							$('#' + this.options.id + '_content_fixed_div').find('tbody').find('tr[role="row"]')[index].insertAdjacentHTML('beforeBegin',htmlStrFixed);
						else if($('#' + this.options.id + '_content_fixed_div tbody')[0])
							$('#' + this.options.id + '_content_fixed_div tbody')[0].insertAdjacentHTML('afterBegin',htmlStrFixed);
					}
				}catch(e){
					//IE情况下
					var table = $('#' + this.options.id + '_content_div table')[0];
					var fixedTable = $('#' + this.options.id + '_content_fixed_div table')[0];
					if(table && fixedTable){
						$.each(rowObjArr, function(i) {
							oThis.createContentOneRowForIE(table,index + i,this);
							oThis.createContentOneRowForIE(fixedTable,index + i,this,'fixed');
						});
					}
				}
				if(this.options.multiSelect){
					if(endFlag){
						$('#' + this.options.id + '_content_multiSelect')[0].insertAdjacentHTML('beforeEnd',htmlStrmultiSelect);
					}else{
						var _content_multiSelect = $('#' + this.options.id + '_content_multiSelect').find('div')[index];
						if(_content_multiSelect)
							_content_multiSelect.insertAdjacentHTML('beforeBegin',htmlStrmultiSelect);
						else
							$('#' + this.options.id + '_content_multiSelect')[0].insertAdjacentHTML('afterBegin',htmlStrmultiSelect);
					}
				}
				if (this.options.showNumCol) {
					if(endFlag){
						$('#' + this.options.id + '_content_numCol')[0].insertAdjacentHTML('beforeEnd',htmlStrNumCol);
					}else{
						var _content_multiSelect = $('#' + this.options.id + '_content_numCol').find('div')[index];
						if(_content_multiSelect)
							_content_multiSelect.insertAdjacentHTML('beforeBegin',htmlStrNumCol);
						else
							$('#' + this.options.id + '_content_numCol')[0].insertAdjacentHTML('afterBegin',htmlStrNumCol);
					}
					this.resetNumCol();
					this.updateNumColLastRowFlag();
				}

				this.repairSumRow();
				this.noRowsShowFun();
//				var obj = {};
//				obj.begin = index;
//				obj.length = rows.length;
//				obj.createFlag = 'fixed';
//				this.renderTypeFun(obj);
				var obj = {};
				obj.begin = index;
				obj.length = rows.length;
				this.renderTypeFun(obj);
			}
			if(this.dataSourceObj.options.values){

			}else{
				this.dataSourceObj.options.values = new Array();
			}
			$.each(rows, function(i) {
				oThis.dataSourceObj.options.values.splice(index + i,0,this);
			});
			this.updateLastRowFlag();

		},
		updateEditRowIndex: function(opType, opIndex, num) {
			if(this.eidtRowIndex < 0) return;
			if(opType == '-') {
				if(opIndex < this.eidtRowIndex) {
					this.eidtRowIndex--;
				} else if(opIndex == this.eidtRowIndex) {
					this.eidtRowIndex = -1;
				}
			} else if(opType == '+') {
				num === undefined && (num = 1)
				if(opIndex <= this.eidtRowIndex) {
					this.eidtRowIndex += num;
				}
			}

		},
		/*
		 * 删除一行
		 */
		deleteOneRow:function(index){
			var oThis = this;
			index = parseInt(index);

			var row = this.dataSourceObj.rows[index];
			if(!row)
				return;
			//this.dataSourceObj.rows.splice(index,1);
			var rowValue = row.value;
			if(this.showType == 'grid'){ //只有grid展示的时候才处理div，针对隐藏情况下还要添加数据
				if(this.eidtRowIndex != -1){
					this.editClose();
				}
			}
			this.dataSourceObj.rows.splice(index,1);
			this.updateEditRowIndex('-', index);
			if(this.selectRows){
				$.each(this.selectRows,function(i){
					if(this == rowValue){
						oThis.selectRows.splice(i,1);
						oThis.selectRowsObj.splice(i,1);
						oThis.selectRowsIndex.splice(i,1);
					}else if(oThis.selectRowsIndex[i] > index){
						oThis.selectRowsIndex[i] = oThis.selectRowsIndex[i] - 1;
					}
				});
			}
			if(this.focusRow){
				if(this.focusRow == rowValue){
					this.focusRow = null;
					this.focusRowObj = null;
					this.focusRowIndex = null;
				}else if(this.focusRowIndex > index){
					this.focusRowIndex = this.focusRowIndex - 1;
				}
			}

			// this.dataSourceObj.rows.splice(index,1);
			if(this.showType == 'grid'){ //只有grid展示的时候才处理div，针对隐藏情况下还要添加数据
				$('#' + this.options.id + '_content_div tbody tr:eq(' + index+ ')').remove();
				$('#' + this.options.id + '_content_fixed_div tbody tr:eq(' + index+ ')').remove();
				$('#' + this.options.id + '_content_multiSelect >div:eq(' + index + ')').remove();
				$('#' + this.options.id + '_content_numCol >.u-grid-content-num:eq('+ index + ')').remove();
				
				//$('#' + this.options.id + '_content_numCol >.u-grid-content-num:nth-child('+ (index+1)+ ')').removeClass("u-grid-content-sel-row");
				//$('#' + this.options.id + '_content_numCol >.u-grid-content-num:nth-child('+(this.dataSourceObj.rows.length+1)+ ')').remove();
				this.resetNumCol();
				this.repairSumRow();
				this.noRowsShowFun();
				this.updateNumColLastRowFlag();
			}
			if(this.dataSourceObj.options.values) {
				var i = this.dataSourceObj.options.values.indexOf(rowValue);
				this.dataSourceObj.options.values.splice(i,1);
			}
			if(this.options.showTree){
				this.dataSourceObj.sortRows();
			}

			if(typeof this.options.onRowDelete == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.index = index;
				if(!this.options.onRowDelete(index)){
					return;
				}
			}
		},

		/*
		 * 删除多行
		 */
		deleteRows:function(indexs){
			var oThis = this;
			// 如果传入的就是选中行的话删除时indexs会发生变化
			var indexss = new Array();

			$.each(indexs, function(i) {
				indexss.push(indexs[i]);
			});
			indexss.sort(function(a,b){
				return b-a;
			});

			$.each(indexss, function(i) {
				oThis.deleteOneRow(this);
			});
		},

		/*
		 * 修改某一行
		 */
		updateRow:function(index,row){
			this.dataSourceObj.rows[index].value = row;
			this.dataSourceObj.options.values[this.dataSourceObj.rows[index].valueIndex] = row;
			if(this.showType == 'grid'){
//				var obj = {};
//				obj.begin = index;
//				obj.length = 1;
//				obj.createFlag = 'fixed';
//				this.renderTypeFun(obj);
				var obj = {};
				obj.begin = index;
				obj.length = 1;
				this.renderTypeFun(obj);
				this.repairSumRow();
			}
		},

		/*
		 * 修改某个cell的值
		 */
		updateValueAt:function(rowIndex,field,value,force){
			var oldValue = $(this.dataSourceObj.rows[rowIndex].value).attr(field);
			if(oldValue != value || force){
				$(this.dataSourceObj.rows[rowIndex].value).attr(field,value);
				$(this.dataSourceObj.options.values[this.dataSourceObj.rows[rowIndex].valueIndex]).attr(field,value);
//				var gridCompColumn = this.getColumnByField(field);
//				var colIndex = this.getIndexOfColumn(gridCompColumn);
//				this.renderTypeByColumn(gridCompColumn,colIndex,rowIndex,1);
				if(this.showType == 'grid'){
					var obj = {};
//					obj.createFlag = 'fixed';
					obj.field = field;
					obj.begin = rowIndex;
					obj.length = 1;
					this.renderTypeFun(obj);
//					var obj = {};
//					obj.begin = rowIndex;
//					obj.length = 1;
//					this.renderTypeFun(obj);
					this.editColIndex = undefined;
					// 如果编辑行为修改行则同时需要修改编辑行的显示
					if(this.eidtRowIndex == rowIndex){
						if($('#' +  this.options.id + "_edit_field_" + field).length > 0){
							if($('#' +  this.options.id + "_edit_field_" + field)[0].type == 'checkbox'){
								if(value == 'Y' || value == 'true'){
									$('#' +  this.options.id + "_edit_field_" + field)[0].checked = true;
								}else{
									$('#' +  this.options.id + "_edit_field_" + field)[0].checked = false;
								}
							}else{
								$('#' +  this.options.id + "_edit_field_" + field)[0].value = value;
							}
 						}
					}
					this.repairSumRow();
				}
				if(typeof this.options.onValueChange == 'function'){
					var obj = {};
					obj.gridObj = this;
					obj.rowIndex = rowIndex;
					obj.field = field;
					obj.oldValue = oldValue;
					obj.newValue = value;
					this.options.onValueChange(obj);
				}
			}
		},
		/*
		 * 选中一行
		 * slice 设置全选时，slice为true，不做渲染，在setAllRowSelect中统一渲染
		 */
		setRowSelect:function(rowIndex, doms){
			var selectDiv, rowTr, fixedRowTr,numColDiv
			if(!this.dataSourceObj.rows[rowIndex])
				return true;
			//已经选中退出
			if(this.dataSourceObj.rows[rowIndex].checked)
				return true;
			if (doms && doms['multiSelectDivs'])
				selectDiv = doms['multiSelectDivs'][rowIndex]
			else
				selectDiv = this.$ele.find('#' + this.options.id + '_content_multiSelect').children()[rowIndex]
			if(typeof this.options.onBeforeRowSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				if(!this.options.onBeforeRowSelected(obj)){
					if(this.options.multiSelect){
						var _input = selectDiv.children[0];
						_input.checked = false;
						//$('#' + this.options.id + '_content_multiSelect input:eq(' + rowIndex+ ')')[0].checked = false;
					}
					return false;
				}
			}

			if(!this.options.multiSelect){
				if(this.selectRowsObj && this.selectRowsObj.length > 0){
					$.each(this.selectRowsObj, function() {
						this.checked = false;
					});
				}
				this.selectRows = new Array();
				this.selectRowsObj = new Array();
				this.selectRowsIndex = new Array();
				if(this.showType == 'grid'){
					$('#' + this.options.id + '_content_tbody tr').removeClass("u-grid-content-sel-row");
					$('#' + this.options.id + '_content_tbody tr a').removeClass("u-grid-content-sel-row");
	//				$('#' + this.options.id + '_content_tbody tr span').removeClass("u-grid-content-sel-row");
					$('#' + this.options.id + '_content_fixed_tbody tr').removeClass("u-grid-content-sel-row");
					$('#' + this.options.id + '_content_fixed_tbody tr a').removeClass("u-grid-content-sel-row");
					if(this.options.multiSelect){
						$('#' + this.options.id + '_content_multiSelect div').removeClass("u-grid-content-sel-row");
					}
					if(this.options.showNumCol){
						$('#' + this.options.id + '_content_numCol div').removeClass("u-grid-content-sel-row");
					}

				}
			}else{
				if(this.showType == 'grid'){
					//$('#' + this.options.id + '_content_multiSelect input:eq(' + rowIndex+ ')')[0].checked = true;
					var _input = selectDiv.children[0];
					_input.checked = true;
				}
			}
			if(this.showType == 'grid'){
				if (doms && doms['contentTrs'])
					rowTr =  doms['contentTrs'][rowIndex]
				else 
					rowTr = this.$ele.find('#' + this.options.id + '_content_tbody tr[role="row"]')[rowIndex]
				$(rowTr).addClass("u-grid-content-sel-row");
				//$('#' + this.options.id + '_content_tbody tr[role="row"]:eq(' + rowIndex+ ') a').addClass("u-grid-content-sel-row");

				if (doms && doms['fixContentTrs'])
					fixedRowTr =  doms['fixContentTrs'][rowIndex]
				else 
					fixedRowTr = this.$ele.find('#' + this.options.id + '_content_fixed_tbody tr[role="row"]')[rowIndex]
				$(fixedRowTr).addClass("u-grid-content-sel-row");

				// $('#' + this.options.id + '_content_fixed_tbody tr[role="row"]:eq(' + rowIndex+ ')').addClass("u-grid-content-sel-row");
				// $('#' + this.options.id + '_content_fixed_tbody tr[role="row"]:eq(' + rowIndex+ ') a').addClass("u-grid-content-sel-row");

				var ini = rowIndex;
				if(this.eidtRowIndex > -1 && this.eidtRowIndex < rowIndex && this.options.editType == 'form'){
					ini++;
				}
				if(this.options.multiSelect){
					if (ini != rowIndex)
						selectDiv =  this.$ele.find('#' + this.options.id + '_content_multiSelect').children()[ini]
					$(selectDiv).addClass('u-grid-content-sel-row');
					// $('#' + this.options.id + '_content_multiSelect >div:eq(' + ini + ')').addClass("u-grid-content-sel-row");
				}
				if(this.options.showNumCol){
					//var numColDiv = this.$ele.find('#' + this.options.id + '_content_numCol').children()[ini]
					if (doms && doms['numColDivs'])
						numColDiv =  doms['numColDivs'][ini]
					else 
						numColDiv = this.$ele.find('#' + this.options.id + '_content_numCol').children()[ini]	
					$(numColDiv).addClass('u-grid-content-sel-row');
					//$('#' + this.options.id + '_content_numCol >div:eq(' + ini + ')').addClass("u-grid-content-sel-row");
				}
			}
			this.selectRows.push(this.dataSourceObj.rows[rowIndex].value);
			this.selectRowsObj.push(this.dataSourceObj.rows[rowIndex]);
			this.selectRowsIndex.push(rowIndex);
			this.dataSourceObj.rows[rowIndex].checked = true;
			if(typeof this.options.onRowSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				this.options.onRowSelected(obj);
			}
			return true;

		},

		/*
		 * 反选一行
		 */
		setRowUnselect:function(rowIndex){
			var oThis=this;
			if(!this.dataSourceObj.rows[rowIndex])
				return true;
			//已经选中退出
			if(!this.dataSourceObj.rows[rowIndex].checked)
				return true;
			if(typeof this.options.onBeforeRowUnSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				if(!this.options.onBeforeRowUnSelected(obj)){
					if(this.options.multiSelect){
						$('#' + this.options.id + '_content_multiSelect input:eq(' + rowIndex+ ')')[0].checked = true;
					}
					return false;
				}
			}

			if(this.options.multiSelect){
				$('#' + this.options.id + '_content_multiSelect input:eq(' + rowIndex+ ')')[0].checked = false;
			}
			var ini = rowIndex;
			if(this.eidtRowIndex > -1 && this.eidtRowIndex < rowIndex && this.options.editType == 'form'){
				ini++;
			}
			$('#' + this.options.id + '_content_tbody tr:eq(' + ini+ ')').removeClass("u-grid-content-sel-row");
			$('#' + this.options.id + '_content_tbody tr:eq(' + ini+ ') a').removeClass("u-grid-content-sel-row");
//			$('#' + this.options.id + '_content_tbody tr:eq(' + ini+ ') span').removeClass("u-grid-content-sel-row");
			$('#' + this.options.id + '_content_fixed_tbody tr:eq(' + ini+ ')').removeClass("u-grid-content-sel-row");
			$('#' + this.options.id + '_content_fixed_tbody tr:eq(' + ini+ ') a').removeClass("u-grid-content-sel-row");
			if(this.options.multiSelect){
				$('#' + this.options.id + '_content_multiSelect >div:eq(' + ini + ')').removeClass("u-grid-content-sel-row");
			}
			if(this.options.showNumCol){
				$('#' + this.options.id + '_content_numCol >div:eq(' + ini + ')').removeClass("u-grid-content-sel-row");
			}
			$.each(this.selectRows,function(i){
				if(this == oThis.dataSourceObj.rows[rowIndex].value){
					oThis.selectRows.splice(i,1);
					oThis.selectRowsObj.splice(i,1);
					oThis.selectRowsIndex.splice(i,1);
				}
			})
			this.dataSourceObj.rows[rowIndex].checked = false;
			if(typeof this.options.onRowUnSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				this.options.onRowUnSelected(obj);
			}
			return true;
		},

		/*
		 * 选中所有行
		 */
		setAllRowSelect:function(){
			$('#' + this.options.id + '_header_multi_input').prop('checked', true)
			if(typeof this.options.onBeforeAllRowSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObjs = this.dataSourceObj.rows;
				if(!this.options.onBeforeAllRowSelected(obj)){
					return;
				}
			}
			// 把需要的dom在循环外获取出来
			var multiSelectDivs = this.$ele.find('#' + this.options.id + '_content_multiSelect').children()
			var numColDivs = this.$ele.find('#' + this.options.id + '_content_numCol').children()
			var contentTrs =  this.$ele.find('#' + this.options.id + '_content_tbody tr[role="row"]')
			var fixContentTrs =  this.$ele.find('#' + this.options.id + '_content_fixed_tbody tr[role="row"]')
			this.$ele.find('#' + this.options.id + '_content_tbody tr[role="row"]')
			for(var i=0;i<this.dataSourceObj.rows.length;i++){
				this.setRowSelect(i, {multiSelectDivs:multiSelectDivs, numColDivs:numColDivs, contentTrs: contentTrs, fixContentTrs: fixContentTrs});
			}
			if(typeof this.options.onAllRowSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObjs = this.dataSourceObj.rows;
				this.options.onAllRowSelected(obj);
			}

		},

		/*
		 * 反选所有行
		 */
		setAllRowUnSelect:function(){
			$('#' + this.options.id + '_header_multi_input').attr('checked', false)
			if(typeof this.options.onBeforeAllRowUnSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObjs = this.dataSourceObj.rows;
				if(!this.options.onBeforeAllRowUnSelected(obj)){
					return;
				}
			}
			for(var i=0;i<this.dataSourceObj.rows.length;i++){
				this.setRowUnselect(i);
			}
			if(typeof this.options.onAllRowUnSelected == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObjs = this.dataSourceObj.rows;
				this.options.onAllRowUnSelected(obj);
			}
		},

		/*
		 * 获取选中行
		 */
		getSelectRows:function(){
			return this.selectRows;
		},

		/*
		 * 获取选中行对应行号
		 */
		getSelectRowsIndex:function(){
			return this.selectRowsIndex;
		},


		/*
		 * focus一行
		 */
		setRowFocus:function(rowIndex){
			//已经选中退出
			if(this.dataSourceObj.rows[rowIndex].focus)
				return true;

			if(!this.dataSourceObj.rows[rowIndex])
				return true;
			if(typeof this.options.onBeforeRowFocus == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				if(!this.options.onBeforeRowFocus(obj)){
					return false;
				}
			}

			$('#' + this.options.id + '_content_tbody tr').removeClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_tbody tr a').removeClass("u-grid-content-focus-row");
//			$('#' + this.options.id + '_content_tbody tr span').removeClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_fixed_tbody tr').removeClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_fixed_tbody tr a').removeClass("u-grid-content-focus-row");
			if(this.options.multiSelect){
				$('#' + this.options.id + '_content_multiSelect').find('div').removeClass("u-grid-content-focus-row");
			}
			if(this.options.showNumCol){
				$('#' + this.options.id + '_content_numCol').find('div').removeClass("u-grid-content-focus-row");
			}
			if(this.focusRowObj){
				this.focusRowObj.focus = false;
			}

			$('#' + this.options.id + '_content_tbody tr[role="row"]:eq(' + rowIndex+ ')').addClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_tbody tr[role="row"]:eq(' + rowIndex+ ') a').addClass("u-grid-content-focus-row");
//			$('#' + this.options.id + '_content_tbody tr:eq(' + rowIndex+ ') span').addClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_fixed_tbody tr[role="row"]:eq(' + rowIndex+ ')').addClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_fixed_tbody tr[role="row"]:eq(' + rowIndex+ ') a').addClass("u-grid-content-focus-row");
			var ini = rowIndex;
			if(this.eidtRowIndex > -1 && this.eidtRowIndex < rowIndex && this.options.editType == 'form'){
				ini++;
			}
			if(this.options.multiSelect){
				$('#' + this.options.id + '_content_multiSelect >div:eq(' + ini + ')').addClass("u-grid-content-focus-row");
			}
			if(this.options.showNumCol){
				$('#' + this.options.id + '_content_numCol >div:eq(' + ini + ')').addClass("u-grid-content-focus-row");
			}
			this.focusRow = this.dataSourceObj.rows[rowIndex].value;
			this.focusRowObj = this.dataSourceObj.rows[rowIndex];
			this.focusRowIndex = rowIndex;
			this.dataSourceObj.rows[rowIndex].focus = true;
			if(typeof this.options.onRowFocus == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				this.options.onRowFocus(obj);
			}
			if(!this.options.multiSelect){
				this.setRowSelect(rowIndex);
			}
			return true;

		},

		/*
		 * 反focus一行
		 */
		setRowUnFocus:function(rowIndex){
			var oThis=this;
			if(!this.dataSourceObj.rows[rowIndex])
				return true;
			if(typeof this.options.onBeforeRowUnFocus == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				if(!this.options.onBeforeRowUnFocus(obj)){
					return false;
				}
			}
			//已经选中退出
			if(!this.dataSourceObj.rows[rowIndex].focus)
				return true;

			var ini = rowIndex;
			if(this.eidtRowIndex > -1 && this.eidtRowIndex < rowIndex && this.options.editType == 'form'){
				ini++;
			}
			$('#' + this.options.id + '_content_tbody tr:eq(' + ini+ ')').removeClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_tbody tr:eq(' + ini+ ') a').removeClass("u-grid-content-focus-row");
//			$('#' + this.options.id + '_content_tbody tr:eq(' + rowIndex+ ') span').removeClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_fixed_tbody tr:eq(' + ini+ ')').removeClass("u-grid-content-focus-row");
			$('#' + this.options.id + '_content_fixed_tbody tr:eq(' + ini+ ') a').removeClass("u-grid-content-focus-row");

			if(this.options.multiSelect){
				$('#' + this.options.id + '_content_multiSelect >div:eq(' + ini + ')').removeClass("u-grid-content-focus-row");
			}
			if(this.options.showNumCol){
				$('#' + this.options.id + '_content_numCol >div:eq(' + ini + ')').removeClass("u-grid-content-focus-row");
			}

			this.dataSourceObj.rows[rowIndex].focus = false;
			this.focusRow = null;
			this.focusRowObj = null;
			this.focusRowIndex = null;
			if(typeof this.options.onRowUnFocus == 'function'){
				var obj = {};
				obj.gridObj = this;
				obj.rowObj = this.dataSourceObj.rows[rowIndex];
				obj.rowIndex = rowIndex;
				this.options.onRowUnFocus(obj);
			}
			if(!this.options.multiSelect){
				this.setRowUnselect(rowIndex);
			}
			return true;
		},
		
		/*
		 * 增加删除时重置数字列
		 */
		resetNumCol:function(){
			var numCols = $('#' + this.options.id + '_content_numCol >.u-grid-content-num');
			$.each(numCols,function(i){
				this.innerHTML = i + 1 + "";
			});
		},

		/*
		 * 获取focus行
		 */
		getFocusRow:function(){
			return this.focusRow;
		},

		/*
		 * 获取focus行对应行号
		 */
		getFocusRowIndex:function(){
			return this.focusRowIndex;
		},
		/*
		 * 获取所有行
		 */
		getAllRows:function(){
			var oThis = this;
			this.allRows = new Array();
			if(this.dataSourceObj.rows){
				$.each(this.dataSourceObj.rows,function(){
					oThis.allRows.push(this.value);
				});
			}
			return this.allRows;
		},

		/*
		 * 根据行号获取row
		 */
		getRowByIndex:function(index){
			return this.dataSourceObj.rows[index];
		},

		/*
		 * 根据某个字段值获取rowIndex
		 */
		getRowIndexByValue:function(field,value){
			var index = -1;
			$.each(this.dataSourceObj.rows,function(i){
				var v = $(this.value).attr(field);
				if(v == value){
					index = i;
				}
			})
			return index;
		},

		/*
		 * 获取数据行下所有子元素
		 */
		getAllChildRow:function(row){
			if(row.allChildRow && row.allChildRow.length > 0){
				return row.allChildRow;
			}
			row.allChildRow = new Array();
			this.getAllChildRowFun(row,row.allChildRow);
			return row.allChildRow;
		},

		/*
		 * 获取数据行下所有子元素的index
		 */
		getAllChildRowIndex:function(row){
			if(row.allChildRowIndex && row.allChildRowIndex.length > 0){
				return row.allChildRowIndex;
			}
			row.allChildRowIndex = new Array();
			this.getAllChildRowIndexFun(row,row.allChildRowIndex);
			return row.allChildRowIndex;
		},


		getAllChildRowFun:function(row,rowArry){
			var oThis = this;
			if(row.childRow.length > 0){
				Array.prototype.push.apply(rowArry, row.childRow);
				$.each(row.childRow, function() {
					  oThis.getAllChildRowFun(this,rowArry);
				});
			}
		},

		getAllChildRowIndexFun:function(row,rowArry){
			var oThis  = this;
			if(row.childRowIndex.length > 0){
				Array.prototype.push.apply(rowArry, row.childRowIndex);
				$.each(row.childRow, function() {
					  oThis.getAllChildRowIndexFun(this,rowArry);
				});
			}
		},

		/*
		 * 根据filed设置renderType
		 */
		setRenderType:function(field,renderType){
			var gridCompColumn = this.getColumnByField(field);
			gridCompColumn.options.renderType = renderType;
			var index = this.getIndexOfColumn(gridCompColumn);
			this.renderTypeByColumn(gridCompColumn,index);
		},

		/*
		 * 根据filed设置editType
		 */
		setEditType:function(field,editType){
			var gridCompColumn = this.getColumnByField(field);
			gridCompColumn.options.editType = editType;
		},

		/*
		 * 设置是否可修改
		 */
		setEditable:function(editable){

			this.options.editable = editable;
		},

		/*
		 * 设置是否显示header
		 */
		setShowHeader:function(showHeader){
			this.options.showHeader = showHeader;
			if(showHeader){
				$('#' + this.options.id + '_header').css('display',"block");
			}else{
				$('#' + this.options.id + '_header').css('display',"none");
			}
		},
		setColumnPrecision:function(field,precision){
			var gridColumn = this.getColumnByField(field);
			gridColumn.options.precision = precision;
//			var obj = {};
//			obj.createFlag = 'fixed';
//			this.renderTypeFun(obj);
//			var obj = {};
			this.renderTypeFun();
			if(this.options.showSumRow){
				this.repairSumRow();
			}
		},
		setMultiSelect:function(multiSelect){
			var oldMultiSelect = this.options.multiSelect;
			if(oldMultiSelect != multiSelect){
				this.options.multiSelect = multiSelect;
				this.initGrid();
			}
		},
		setShowNumCol:function(showNumCol){
			var oldShowNumCol = this.options.showNumCol;
			if(oldShowNumCol != showNumCol){
				this.options.showNumCol = showNumCol;
				this.initGrid();
			}
		},
		isGridShow:function(){
			if(this.showType == 'grid')
				return true;
			return false;
		}
	}
	dataSource.prototype = {
		/*
		 * 将values转化为rows并进行排序
		 */
		sortRows:function(field,sortType){
			if(this.gridComp.options.showTree){
				this.treeSortRows(field,sortType);
			}else{
				this.basicSortRows(field,sortType);
			}
			this.gridComp.eidtRowIndex = -1;
		},
		/*
		 * 根据排序的优先级的排序
		 * prioArray = [{field:'f2', sortType:'asc'}, {field:'f3', sortType:'desc'}, {field:'f1', sortType:'asc'}]
		 */
		sortRowsByPrio: function(prioArray, cancelSort) {
			var oThis = this;
			if(cancelSort) {
				this.rows = new Array();
				if(this.options.values){
					$.each(this.options.values, function(i) {
						var rowObj = {};
						rowObj.value = this;
						rowObj.valueIndex = i;
						oThis.rows.push(rowObj);
					});
				}
			}

			var evalStr = function(i) {
				if(i == prioArray.length-1) {
					return 'by(prioArray['+i+'].field, prioArray['+i+'].sortType)'
				} else {
					return 'by(prioArray['+i+'].field, prioArray['+i+'].sortType,' + evalStr(i+1) + ')'
				}

			}

			var by = function(field, sortType, eqCall) {
				var callee = arguments.callee
				return function(a, b) {
					var v1 = $(a.value).attr(field);
					var v2 = $(b.value).attr(field);
					var dataType = oThis.gridComp.getColumnByField(field).options.dataType;
					if(dataType == 'Float'){
						v1 = parseFloat(v1);
						v2 = parseFloat(v2);
						if(isNaN(v1)){
							return 1;
						}
						if(isNaN(v2)){
							return -1;
						}
						if(v1 == v2 && eqCall) {
							return eqCall()
						}
						return sortType == 'asc' ? (v1-v2) : (v2-v1);
					}else if (dataType == 'Int'){
						v1 = parseInt(v1);
						v2 = parseInt(v2);
						if(isNaN(v1)){
							return 1;
						}
						if(isNaN(v2)){
							return -1;
						}
						if(v1 == v2 && eqCall) {
							return eqCall()
						}
						return sortType == 'asc' ? (v1-v2) : (v2-v1);
					}else{
						v1 = oThis.gridComp.getString(v1,'');
						v2 = oThis.gridComp.getString(v2,'');
						try{
							var rsl = v1.localeCompare(v2)
							if(rsl === 0 && eqCall) {
								return eqCall()
							}
							if(rsl === 0) {
								return 0
							}
							return sortType == 'asc' ? rsl : -rsl;
						}catch(e){
							return 0;
						}
					}
				}
			}

			this.rows.sort(eval(evalStr(0)));
		},
		/*
		 * 将values转化为rows并进行排序(标准)
		 */
		basicSortRows: function(field, sortType) {
			var oThis = this;
			var dataType = "";
			if(field){
				dataType = this.gridComp.getColumnByField(field).options.dataType;
			}
			if (sortType == "asc") {
				this.rows.sort(function(a, b) {
					var v1 = $(b.value).attr(field);
					var v2 = $(a.value).attr(field);
					if(dataType == 'Float'){
						v1 = parseFloat(v1);
						v2 = parseFloat(v2);
						if(isNaN(v1)){
							return 1;
						}
						if(isNaN(v2)){
							return -1;
						}
						return v1-v2;
					}else if (dataType == 'Int'){
						v1 = parseInt(v1);
						v2 = parseInt(v2);
						if(isNaN(v1)){
							return 1;
						}
						if(isNaN(v2)){
							return -1;
						}
						return v1-v2;
					}else{
						v1 = oThis.gridComp.getString(v1,'');
						v2 = oThis.gridComp.getString(v2,'');
						try{
							return v1.localeCompare(v2);
						}catch(e){
							return 0;
						}
					}
				});
			} else if (sortType == "desc") {
				this.rows.sort(function(a, b) {
					var v1 = $(a.value).attr(field);
					var v2 = $(b.value).attr(field);
					if(dataType == 'Float'){
						v1 = parseFloat(v1);
						v2 = parseFloat(v2);
						if(isNaN(v1)){
							return 1;
						}
						if(isNaN(v2)){
							return -1;
						}
						return v1-v2;
					}else if (dataType == 'Int'){
						v1 = parseInt(v1);
						v2 = parseInt(v2);
						if(isNaN(v1)){
							return 1;
						}
						if(isNaN(v2)){
							return -1;
						}
						return v1-v2;
					}else{
						v1 = oThis.gridComp.getString(v1,'');
						v2 = oThis.gridComp.getString(v2,'');
						try{
							return v1.localeCompare(v2);
						}catch(e){
							return 0;
						}
					}
				});
			} else {
				this.rows = new Array();
				if(this.options.values){
					$.each(this.options.values, function(i) {
						var rowObj = {};
						rowObj.value = this;
						rowObj.valueIndex = i;
						oThis.rows.push(rowObj);
					});
				}
			}
		},

		/*
		 * 将values转化为rows并进行排序(数表)
		 */
		treeSortRows: function(field, sortType) {
			var oThis = this;
			this.rows = new Array();
			this.hasParentRows = new Array();
			this.nothasParentRows = new Array();
			if(this.options.values){
				$.each(this.options.values, function(i){
					var rowObj = {};
					var $this = $(this);
					var keyField = oThis.gridComp.options.keyField;
					var parentKeyField = oThis.gridComp.options.parentKeyField;
					var keyValue = oThis.gridComp.getString($this.attr(keyField),'');
					var parentKeyValue = oThis.gridComp.getString($this.attr(parentKeyField),'');
					rowObj.valueIndex = i;
					rowObj.value = this;
					rowObj.keyValue = keyValue;
					rowObj.parentKeyValue = parentKeyValue;
					if(parentKeyValue == ''){
						oThis.nothasParentRows.push(rowObj);
					}else{
						oThis.hasParentRows.push(rowObj);
					}
					oThis.rows.push(rowObj);
				});
				// 判断存在父项的数据的父项是否真正存在
				$.each(this.hasParentRows,function(i){
					var parentKeyValue = this.parentKeyValue;
					var hasParent = false;
					$.each(oThis.rows,function(){
						if(this.keyValue == parentKeyValue){
							hasParent = true;
						}
					});
					if(!hasParent){
						oThis.hasParentRows.splice(i,0);
						oThis.nothasParentRows.push(this);
					}
				});
				oThis.rows = new Array();
				var level = 0;
				// 遍历nothasParentRows，将子项加入rows
				$.each(this.nothasParentRows, function(i) {
					this.level = level;
					oThis.rows.push(this);
					oThis.pushChildRows(this,level);
				});
			}
		},

		/*
		 * 将当前行子项插入rows数组
		 */
		pushChildRows:function(row,level){
			var keyValue = row.keyValue;
			var oThis = this;
			var nowLevel = parseInt(level) + 1;
			var hasChild = false;
			var childRowArray = new Array();
			var childRowIndexArray = new Array();
			$.each(this.hasParentRows, function(i) {
				if(this && this.parentKeyValue == keyValue){
					hasChild = true;
					this.level = nowLevel;
					oThis.rows.push(this);
					childRowArray.push(this);
					var index = parseInt(oThis.rows.length - 1);
					childRowIndexArray.push(index);
					oThis.hasParentRows.splice(i,0);
					oThis.pushChildRows(this,nowLevel);
				}
			});
			row.hasChild = hasChild;
			row.childRow = childRowArray;
			row.childRowIndex = childRowIndexArray;
		},
		/*
		 * 获取合计值
		 */
		getSumValue:function(field,gridCompColumn,gridComp){
			var sumValue = null;
			if(gridCompColumn.options.sumCol){
				$.each(this.rows, function(i) {
					var v = $(this.value).attr(field);
					if(gridCompColumn.options.dataType == 'Int'){
						v = gridComp.getInt(v,0);
						sumValue  += parseInt(v);
					}else{
						v = gridComp.getFloat(v,0);
						sumValue  = gridComp.accAdd(sumValue,parseFloat(v));
//						sumValue  += parseFloat(v);
					}
				});
			}
			// 处理精度
			if(gridCompColumn.options.dataType == 'Float' && gridCompColumn.options.precision){
				var o = {};
				o.value = sumValue;
				o.precision = gridCompColumn.options.precision;
				sumValue = gridComp.DicimalFormater(o);
			}
			if(sumValue != null && sumValue != undefined && sumValue != 'null' && sumValue != 'undefined'){
				return sumValue + '';
			}else{
				return '';
			}

		}

	};
	var old = $.fn.grid;
	// 方法扩展
	$.fn.grid = function(options) {
		var grid = $(this).data('gridComp');
		if(!grid)
			$(this).data('gridComp',(grid = new gridComp(this, options)));
		return grid;
	};

	$.fn.grid.noConflict = function() {
		$.fn.grid = old;
		return this;
	}
})(jQuery, window, document);

u.GridAdapter = u.BaseAdapter.extend({
	
	initialize: function(options) {
		// 初始options中包含grid的属性设置，还需要增加dataSource、columns、transMap以及事件处理

		var opt = options['options'] || {},
				viewModel = options['model'];
		var element = typeof options['el'] === 'string' ? document.querySelector(options['el']) : options['el'];
		var app = options['app'];
		this.id = opt['id'];
		options = opt;

		var oThis = this;
		var compDiv = null;
		var comp = null;
		this.dataTable = u.getJSObject(viewModel, options["data"]);
		this.element = element;
		this.$element = $(element);
		this.editComponentDiv = {};
		this.editComponent = {};
		this.id = options['id'];
		this.gridOptions = options;
		
		// 在html中将函数类参数进行处理
		this.gridOptions.onBeforeRowSelected = u.getFunction(viewModel,this.gridOptions.onBeforeRowSelected);
		this.gridOptions.onRowSelected = u.getFunction(viewModel,this.gridOptions.onRowSelected);
		this.gridOptions.onBeforeRowUnSelected = u.getFunction(viewModel,this.gridOptions.onBeforeRowUnSelected);
		this.gridOptions.onRowUnSelected = u.getFunction(viewModel,this.gridOptions.onRowUnSelected);
		this.gridOptions.onBeforeAllRowSelected = u.getFunction(viewModel,this.gridOptions.onBeforeAllRowSelected);
		this.gridOptions.onAllRowSelected = u.getFunction(viewModel,this.gridOptions.onAllRowSelected);
		this.gridOptions.onBeforeAllRowUnSelected = u.getFunction(viewModel,this.gridOptions.onBeforeAllRowUnSelected);
		this.gridOptions.onAllRowUnSelected = u.getFunction(viewModel,this.gridOptions.onAllRowUnSelected);
		this.gridOptions.onBeforeRowFocus = u.getFunction(viewModel,this.gridOptions.onBeforeRowFocus);
		this.gridOptions.onRowFocus = u.getFunction(viewModel,this.gridOptions.onRowFocus);
		this.gridOptions.onBeforeRowUnFocus = u.getFunction(viewModel,this.gridOptions.onBeforeRowUnFocus);
		this.gridOptions.onRowUnFocus = u.getFunction(viewModel,this.gridOptions.onRowUnFocus);
		this.gridOptions.onDblClickFun = u.getFunction(viewModel,this.gridOptions.onDblClickFun);
		this.gridOptions.onValueChange = u.getFunction(viewModel,this.gridOptions.onValueChange);
		/*
		 * 处理column参数  item
		 * div子项div存储column信息
		 */
		var columns = [];
		$("div",this.$element).each(function() {
			var ops = $(this).attr('options')
			if(typeof(ops) == "undefined")
				var column = eval("(" + ops+")");
			else
				var column = JSON.parse(ops);
			// 处理精度，以dataTable的精度为准
			
			/*处理editType*/
			var eType = u.getFunction(viewModel, column.editType);
			var rType = u.getFunction(viewModel, column.renderType);
			var afterEType = u.getFunction(viewModel, column.afterEType);
			var afterRType = u.getFunction(viewModel, column.afterRType);
			var sumRenderType = u.getFunction(viewModel, column.sumRenderType);
			column.sumRenderType = sumRenderType;
			var eOptions = {};
			if(column.editOptions){
				if(typeof(column.editOptions) == "undefined")
					var eOptions = eval("(" + column.editOptions +")");
				else
					var eOptions = column.editOptions;
			}
			eOptions.data = options['data']
			eOptions.field = column['field']
			// 默认按照string处理
			if(eType == '')
					eType = 'string';
			if(eType == 'string' || eType == 'integer' || eType == 'checkbox' || eType == 'combo' || eType == 'radio' || eType == 'float' || eType == 'currency' || eType == 'datetime'|| eType == 'date' || eType == 'time'){
				if(eType == 'string'){
					compDiv = $('<div><input type="text" class="u-grid-edit-item-string"></div>');
					if(!options.editType || options.editType =="default" ){
						compDiv.addClass("eType-input")
					}
					eOptions.dataType = 'string';
					comp = new u.StringAdapter({
						el:compDiv[0],
						options:eOptions,
						model: viewModel
					});
					//$.compManager.plugs.string(compDiv.find("input")[0],eOptions,viewModel);

				}else if(eType == 'integer'){
					compDiv = $('<div><input type="text" class="u-grid-edit-item-integer"></div>');
					if(!options.editType || options.editType =="default" ){
						compDiv.addClass("eType-input")
					}
					eOptions.dataType = 'integer';
					comp = new u.IntegerAdapter({
						el:compDiv[0],
						options:eOptions,
						model: viewModel
					});

					//comp = new $.compManager.plugs.integer(compDiv.find("input")[0],eOptions,viewModel);

				} else if(eType == 'checkbox'){
					compDiv = $('<div><input id="' + oThis.id + "_edit_field_" + column['field'] + '" type="checkbox" class="u-grid-edit-item-checkbox"></div>');
					//eOptions.dataType = 'integer';
					
					if($.CheckboxComp){
						comp = new $.CheckboxComp(compDiv.find("input")[0],eOptions,viewModel);
					}else{
						comp = new u.CheckboxAdapter({
							el:compDiv[0],
							options:eOptions,
							model: viewModel
						});
					}
					

					//comp = new $.compManager.plugs.check(compDiv.find("input")[0],eOptions,viewModel);

				}else if(eType == 'combo'){
					compDiv = $('<div class="input-group  form_date u-grid-edit-item-comb"><div  type="text" class="form-control grid-combox"></div><i class="input-group-addon" ><i class="fa fa-angle-down"></i></i></div>');
					//comp = new $.compManager.plugs.combo(compDiv[0],eOptions,viewModel);
					//comp = new u.Combobox({
					//	el:compDiv[0],
					//	options:eOptions,
					//	model: viewModel
					//});
					if($.Combobox){
						comp = new $.Combobox(compDiv[0],eOptions,viewModel)
					}else{
						comp = new u.ComboboxAdapter({
							el:compDiv[0],
							options:eOptions,
							model: viewModel
						});
					}
					
				}else if(eType == 'radio'){
					if(!options.editType || options.editType =="default" ){
						compDiv = null;
						comp = null;
					}else {
						compDiv = $('<div class="u-grid-edit-item-radio"><input type="radio" name="identity" /><i data-role="name"></i></div>');
						//comp = new $.compManager.plugs.radio(compDiv[0],eOptions,viewModel);
						comp = new u.RadioAdapter({
							el:compDiv[0],
							options:eOptions,
							model: viewModel
						});

					}
				}else if(eType == 'float'){
					compDiv = $('<div><input type="text" class="u-grid-edit-item-float"></div>');
					if(!options.editType || options.editType =="default" ){
						compDiv.addClass("eType-input")
					}
					//comp = new $.compManager.plugs.float(compDiv.find("input")[0],eOptions,viewModel);
					eOptions.dataType = 'float';
					comp = new u.FloatAdapter({
						el:compDiv[0],
						options:eOptions,
						model: viewModel
					});

				}else if(eType == 'currency'){
					compDiv = $('<div><input type="text" class="u-grid-edit-item-currency"></div>');
					if(!options.editType || options.editType =="default" ){
						compDiv.addClass("eType-input")
					}
					//comp = new $.compManager.plugs.currency(compDiv.find("input")[0],eOptions,viewModel);
					eOptions.dataType = 'currency';
					comp = new u.CurrencyAdapter({
						el:compDiv[0],
						options:eOptions,
						model: viewModel
					});

				}else if(eType == 'datetime'){
					compDiv = $('<div class="input-group u-grid-edit-item-datetime" ><input class="form-control" /><span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span></div>');
					
					//comp = new $.compManager.plugs.datetime(compDiv[0],eOptions,viewModel);
					if($.DateTime){
						comp = new $.DateTime(compDiv[0],eOptions,viewModel);
					}else{
						comp = new u.DateTimeAdapter({
							el:compDiv[0],
							options:eOptions,
							model: viewModel
						});
					}

				}else if(eType == 'date'){
					compDiv = $('<div class="input-group u-grid-edit-item-date" ><input class="form-control" /><span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span></div>');
					
					//comp = new $.compManager.plugs.date(compDiv[0],eOptions,viewModel);
					if($.DateComp){
						comp = new $.DateComp(compDiv[0],eOptions,viewModel);
					}else{
						comp = new u.DateTimeAdapter({
							el:compDiv[0],
							options:eOptions,
							model: viewModel
						});
					}
					

				}
				if (comp && comp.dataAdapter){
					comp = comp.dataAdapter;
				}
				//else if(eType == 'time'){
				//	compDiv = $('<div class="input-group u-grid-edit-item-date" ><input class="form-control" /><div class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></div></div>');
				//
				//	//comp = new $.compManager.plugs.time(compDiv[0],eOptions,viewModel);
				//}

				oThis.editComponentDiv[column.field] = compDiv;
				oThis.editComponent[column.field] = comp;
				
				
				column.editType = function(obj){
					if(oThis.editComponentDiv[column.field][0].childNodes.length > 0){
					}else{
						//IE8有问题，所以需要重新创建div,将上面的代码直接拷贝
						if(eType == 'string'){
							compDiv = $('<div><input type="text" class="u-grid-edit-item-string"></div>');
							if(!options.editType || options.editType =="default" ){
								compDiv.addClass("eType-input")
							}
							comp = new $.compManager.plugs.string(compDiv.find("input")[0],eOptions,viewModel);

						}else if(eType == 'integer'){
							compDiv = $('<div><input type="text" class="u-grid-edit-item-integer"></div>');
							if(!options.editType || options.editType =="default" ){
								compDiv.addClass("eType-input")
							}
							comp = new $.compManager.plugs.integer(compDiv.find("input")[0],eOptions,viewModel);

						} else if(eType == 'checkbox'){
							compDiv = $('<div><input id="' + oThis.id + "_edit_field_" + column['field'] + '" type="checkbox" class="u-grid-edit-item-checkbox"></div>');
							comp = new $.compManager.plugs.check(compDiv.find("input")[0],eOptions,viewModel);

						}else if(eType == 'combo'){
							compDiv = $('<div class="input-group  form_date u-grid-edit-item-comb"><div  type="text" class="form-control grid-combox"></div><i class="input-group-addon" ><i class="fa fa-angle-down"></i></i></div>');
							comp = new $.compManager.plugs.combo(compDiv[0],eOptions,viewModel);

						}else if(eType == 'radio'){
							if(!options.editType || options.editType =="default" ){
								compDiv = null;
								comp = null;
							}else {
								compDiv = $('<div class="u-grid-edit-item-radio"><input type="radio" name="identity" /><i data-role="name"></i></div>');
								comp = new $.compManager.plugs.radio(compDiv[0],eOptions,viewModel);
							}
						}else if(eType == 'float'){
							compDiv = $('<div><input type="text" class="u-grid-edit-item-float"></div>');
							if(!options.editType || options.editType =="default" ){
								compDiv.addClass("eType-input")
							}
							comp = new $.compManager.plugs.float(compDiv.find("input")[0],eOptions,viewModel);
						}else if(eType == 'currency'){
							compDiv = $('<div><input type="text" class="u-grid-edit-item-currency"></div>');
							if(!options.editType || options.editType =="default" ){
								compDiv.addClass("eType-input")
							}
							comp = new $.compManager.plugs.currency(compDiv.find("input")[0],eOptions,viewModel);
						}else if(eType == 'datetime'){ 
							compDiv = $('<div class="input-group u-grid-edit-item-datetime" ><input class="form-control" /><span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span></div>');
							eOptions.widgetParent = $("body")
							comp = new $.compManager.plugs.datetime(compDiv[0],eOptions,viewModel);
						}else if(eType == 'date'){
							compDiv = $('<div class="input-group u-grid-edit-item-date" ><input class="form-control" /><span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span></div>');
							eOptions.widgetParent = $("body")
							comp = new $.compManager.plugs.date(compDiv[0],eOptions,viewModel);
						}else if(eType == 'time'){
							compDiv = $('<div class="input-group u-grid-edit-item-date" ><input class="form-control" /><span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span></div>');
							eOptions.widgetParent = $("body")
							comp = new $.compManager.plugs.time(compDiv[0],eOptions,viewModel);
						}

						oThis.editComponentDiv[column.field] = compDiv;
						oThis.editComponent[column.field] = comp;
					}

					var comp = oThis.editComponent[column.field]
					if (!comp)
						return
					obj.element.innerHTML = '';
					var $Div = $('<div class="u-grid-content-td-div" style="margin:0px;"></div>');
					var row = oThis.getDataTableRow(obj.rowObj)
					$(obj.element).append($Div);
					$Div.append(oThis.editComponentDiv[column.field]);
					if(comp.required) {
						$(obj.element).parent().find('.u-grid-edit-mustFlag').show()
					}

					// checkbox 类型
					if($Div.find('.checkbox').length > 0) {
						$Div.closest('.u-grid-edit-div').css({'position': 'absolute', 'left': '83px'});
						$Div.closest('.u-grid-edit-whole-div').find('.u-grid-edit-label').css({'margin-left': '124px', 'text-align': 'left'})
					}
					comp.modelValueChange(obj.value);

					// 根据惊道需求增加editype之后的处理,此处只针对grid.js中的默认eType进行处理，非默认通过eType进行处理
					if(typeof afterEType == 'function'){
						afterEType.call(this,obj);
					}
				}
			}else if (typeof eType == 'function'){
				column.editType = eType;
			}
			
			if(rType == 'booleanRender'){
				column.renderType = function(obj){
					var checkStr = '';
					if(obj.value == 'Y'){
						checkStr = 'checked';
					}
					var htmlStr = '<input type="checkbox"   style="cursor:default;" disabled ' + checkStr +'>'
					obj.element.innerHTML = htmlStr;

					// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}else if(rType == 'integerRender'){
				column.renderType = function(obj){
					obj.element.innerHTML =  obj.value
					$(obj.element).css('text-align', 'right')	

					// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}else if(rType == 'currencyRender'){
				column.renderType = function(obj){
					//需要处理精度
					
					var grid = obj.gridObj											
					var column = obj.gridCompColumn
					var field = column.options.field
					var rowIndex = obj.rowIndex
					var datatable = grid.dataTable
					var rowId =  $(grid.dataSourceObj.rows[rowIndex].value).attr("$_#_@_id");
					var row = datatable.getRowByRowId(rowId);				
					if(!row)
						return;
					var rprec = row.getMeta(field, 'precision')
					var maskerMeta = iweb.Core.getMaskerMeta('float') || {}
					var precision = typeof(parseFloat(rprec)) == 'number' ? rprec : maskerMeta.precision;
					maskerMeta.precision = precision;

					maskerMeta.precision = precision || maskerMeta.precision
					var formater = new u.NumberFormater(maskerMeta.precision);
					var masker = new u.NumberMasker(maskerMeta);
					var svalue = masker.format(formater.format(obj.value)).value
					obj.element.innerHTML =  svalue
					$(obj.element).css('text-align', 'right')
					$(obj.element).attr('title', svalue)

					// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}else if(rType == 'floatRender'){
				column.renderType = function(obj){
					//需要处理精度
					
					var grid = obj.gridObj											
					var column = obj.gridCompColumn
					var field = column.options.field
					var rowIndex = obj.rowIndex
					var datatable = grid.dataTable
					var rowId =  $(grid.dataSourceObj.rows[rowIndex].value).attr("$_#_@_id");
					var row = datatable.getRowByRowId(rowId);				
					if(!row)
						return;
					var rprec =  row.getMeta(field, 'precision') || column.options.precision;
					var maskerMeta = iweb.Core.getMaskerMeta('float') || {}
					var precision = typeof(parseFloat(rprec)) == 'number' ? rprec : maskerMeta.precision;
					maskerMeta.precision = precision;

					var formater = new u.NumberFormater(maskerMeta.precision);
					var masker = new u.NumberMasker(maskerMeta);
					var svalue = masker.format(formater.format(obj.value)).value
					obj.element.innerHTML =  svalue
					$(obj.element).css('text-align', 'right')
					$(obj.element).attr('title', svalue)

					// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}else if(rType == 'comboRender'){
				column.renderType = function(obj){
				  
				  //需要将key转化为name
					var ds = u.getJSObject(viewModel, eOptions['datasource'])
				
					obj.element.innerHTML = '';
					if(nameArr){
						nameArr.length = 0
					}
					
					var valArr = obj.value.split(',')
					var nameArr = []
					for( var i=0,length=ds.length; i<length; i++){
                      for(var j=0; j<valArr.length;j++){
                      	  if(ds[i].pk == valArr[j]){
                      	  	  nameArr.push(ds[i].name)
                      	  }
                      }
					}	
					var svalue = nameArr.toString()
					obj.element.innerHTML = svalue;
					$(obj.element).attr('title', svalue)
				  				  
				  	// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}else if(rType == 'dateRender'){
				//通过grid的dataType为Date format处理
				column.renderType = function(obj){
					var svalue =  moment(obj.value).format('YYYY-M-D ') //$.dateRender(obj.value)
					obj.element.innerHTML = svalue;
					$(obj.element).attr('title', svalue)
					// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}else if(rType == 'dateTimeRender'){
				//通过grid的dataType为DateTime format处理
				column.renderType = function(obj){
					var svalue = moment(obj.value).format('YYYY-M-D HH:mm'); //$.dateTimeRender(obj.value)
					obj.element.innerHTML = svalue;
					$(obj.element).attr('title', svalue)

					// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}else if (typeof rType == 'function'){
				column.renderType =  rType
			}else if(rType == 'radioRender'){
				column.renderType = function(params){
					//debugger
					var ds = u.getJSObject(viewModel, eOptions['datasource'])
					var value = params.value
					var compDiv = $('<div class="u-grid-edit-item-radio"></div>');
					
					params.element.innerHTML = ""
					$(params.element).append(compDiv)

					for(var i = 0;i < ds.length;i++){
						if(ds[i].pk==value)
							compDiv.append('<input name="'+column.field+params.row.value['$_#_@_id']+'" type="radio" value="'+ds[i].pk +'" checked="true" /><i data-role="name">' +ds[i].name+ '</i>')
						else
							compDiv.append('<input name="'+column.field+params.row.value['$_#_@_id']+'" type="radio" value="'+ds[i].pk +'"/><i data-role="name">' +ds[i].name+ '</i>')
					}
					compDiv.find(":radio").each(function() {

						$(this).on('click', function() {

							var val = this.value
							compDiv.find(":radio").each(function() {
								if (this.value == val) {
									this.checked = true;
								}else{
									this.checked = false;
								}
							})
							var grid = params.gridObj
							var column = params.gridCompColumn
							var field = column.options.field
							var datatable = grid.dataTable
							//var rowIndex = params.rowIndex
							//var tmprowId =  $(grid.dataSourceObj.rows[rowIndex].value).attr("$_#_@_id");
							var rowId = params.row.value['$_#_@_id'];

							var row = datatable.getRowByRowId(rowId);

							row.setValue(field,val)
						})
					})
//					var comp = new $.compManager.plugs.radio(compDiv[0],eOptions,viewModel);					
//					for( var i=0,length=rdo.length; i<length; i++){
//					   if(rdo[i].pk==value){
//					   	 obj.element.innerHTML = '<input type="radio" checked><i data-role="name">'+rdo[i].name+'</i>';
//					   	 break;
//					   }
//					}				
					// 根据惊道需求增加renderType之后的处理,此处只针对grid.js中的默认render进行处理，非默认通过renderType进行处理
					if(typeof afterRType == 'function'){
						afterRType.call(this,obj);
					}
				}
			}

			var defineSumRenderType = column.sumRenderType;
			column.sumRenderType = function(obj){
				obj.value = parseFloat(obj.value);
				var grid = obj.gridObj											
				var column = obj.gridCompColumn
				var rprec = column.options.precision;
				var maskerMeta = iweb.Core.getMaskerMeta('float') || {}
				var precision = rprec == 0 || (rprec && typeof(parseFloat(rprec)) == 'number')? rprec : maskerMeta.precision;
				maskerMeta.precision = precision;

				var formater = new u.NumberFormater(maskerMeta.precision);
				var masker = new u.NumberMasker(maskerMeta);
				var svalue = masker.format(formater.format(obj.value)).value
				obj.element.innerHTML =  svalue
				$(obj.element).parent().css('text-align', 'right')
				$(obj.element).css('text-align', 'right')
				$(obj.element).attr('title', svalue)
				if(typeof defineSumRenderType == 'function')
					defineSumRenderType.call(grid,obj);
			}

			columns.push(column);	
		});
		
		if (app && app.adjustFunc)
			app.adjustFunc.call(app, {id: this.id, type:'gridColumn', columns:columns});

		this.gridOptions.columns = columns;
		
		
		/*
		 * 处理viewModel与grid之间的绑定
		 * 
		 */
		var onRowSelectedFun = this.gridOptions.onRowSelected; 
		// 选中
		this.gridOptions.onRowSelected = function(obj) {
			var rowId = oThis.grid.dataSourceObj.rows[obj.rowIndex].value['$_#_@_id'];
			var index = oThis.dataTable.getIndexByRowId(rowId);
			if(oThis.grid.options.multiSelect){
				oThis.dataTable.addRowsSelect([index]);
			}else{
				oThis.dataTable.setRowSelect(index);
			}
			
			if(onRowSelectedFun){
				onRowSelectedFun.call(oThis,obj);
			}
		};
		this.dataTable.on(u.DataTable.ON_ROW_SELECT, function(event) {
			/*index转化为grid的index*/
			$.each(event.rowIds, function() {
				var index = oThis.grid.getRowIndexByValue('$_#_@_id',this);
				var selectFlag = true;
				if(index > -1){
					selectFlag = oThis.grid.setRowSelect(parseInt(index));
					if(!selectFlag){
						oThis.dataTable.setRowUnSelect(oThis.dataTable.getIndexByRowId(this));
					}
				}
			});
		});
		
		//全选
		this.dataTable.on(u.DataTable.ON_ROW_ALLSELECT, function(event) {
			oThis.grid.setAllRowSelect()
		});
		
		//全返选
		this.dataTable.on(u.DataTable.ON_ROW_ALLUNSELECT, function(event) {
			oThis.grid.setAllRowUnSelect()
		});
		
		// 反选
		var onRowUnSelectedFun = this.gridOptions.onRowUnSelected; 
		this.gridOptions.onRowUnSelected = function(obj) {
			var rowId = oThis.grid.dataSourceObj.rows[obj.rowIndex].value['$_#_@_id'];
			var index = oThis.dataTable.getIndexByRowId(rowId);
			oThis.dataTable.setRowUnSelect(index);
			if(onRowUnSelectedFun){
				onRowUnSelectedFun.call(oThis,obj);
			}
		};
		this.dataTable.on(u.DataTable.ON_ROW_UNSELECT, function(event) {
			$.each(event.rowIds, function() {
				var index = oThis.grid.getRowIndexByValue('$_#_@_id',this);
				var unSelectFlag = true;
				if(index > -1){
					unSelectFlag = oThis.grid.setRowUnselect(parseInt(index));
					if(!unSelectFlag){
						if(oThis.grid.options.multiSelect){
							oThis.dataTable.addRowsSelect([oThis.dataTable.getIndexByRowId(this)]);
						}else{
							oThis.dataTable.setRowSelect(oThis.dataTable.getIndexByRowId(this));
						}
					}
				}
			});
		});
		
		var onRowFocusFun = this.gridOptions.onRowFocus; 
		// focus
		this.gridOptions.onRowFocus = function(obj) {
			var rowId = oThis.grid.dataSourceObj.rows[obj.rowIndex].value['$_#_@_id'];
			var index = oThis.dataTable.getIndexByRowId(rowId);
			
			if(oThis.grid.options.rowClickBan) {
				oThis.dataTable.setRowFocus(index, true);
			} else {
				oThis.dataTable.setRowFocus(index);
			}
			
			if(onRowFocusFun){
				onRowFocusFun.call(oThis,obj);
			}
		};
		this.dataTable.on(u.DataTable.ON_ROW_FOCUS, function(event) {
			/*index转化为grid的index*/
			var index = oThis.grid.getRowIndexByValue('$_#_@_id',event.rowId);
		
			var focusFlag = true;
			if(index > -1){
				focusFlag = oThis.grid.setRowFocus(parseInt(index));
				
				if(!focusFlag){
					oThis.dataTable.setRowUnFocus(oThis.dataTable.getIndexByRowId(event.rowId));
				}
			}
		});
		
		// 反focus
		var onRowUnFocusFun = this.gridOptions.onRowUnFocus; 
		this.gridOptions.onRowUnFocus = function(obj) {
			var rowId = oThis.grid.dataSourceObj.rows[obj.rowIndex].value['$_#_@_id'];
			var index = oThis.dataTable.getIndexByRowId(rowId);
			oThis.dataTable.setRowUnFocus(index);
			if(onRowUnFocusFun){
				onRowUnFocusFun.call(oThis,obj);
			}
		};
		this.dataTable.on(u.DataTable.ON_ROW_UNFOCUS, function(event) {
			var index = oThis.grid.getRowIndexByValue('$_#_@_id',event.rowId);
			var unFocusFlag = true;
			if(index > -1){
				unFocusFlag = oThis.grid.setRowUnFocus(parseInt(index));
				if(!unFocusFlag){
					oThis.dataTable.setRowFocus(oThis.dataTable.getIndexByRowId(event.rowId));
				}
			}
		});
		
		// 增行,只考虑viewModel传入grid
//		var onRowInsertFun = this.gridOptions.onRowInsert; 
//		this.gridOptions.onRowInsert = function(obj){
//			dataTable.insertRow(obj.index,obj.row);
//			if(onRowSelectedFun){
//				viewModel[onRowUnSelectedFun].call(grid,grid, row, rowindex);
//			}
//		};
		this.dataTable.on(u.DataTable.ON_INSERT, function(event) {
			var gridRows = new Array();
			$.each(event.rows,function(){
				var row = this.data;
				var id = this.rowId;
				var gridRow = {};
				for(var filed in row){
					gridRow[filed] = row[filed].value;
				}
				gridRow['$_#_@_id'] = id;
				gridRows.push(gridRow); 
			})
			oThis.grid.addRows(gridRows,event.index);
		});
		
		this.dataTable.on(u.DataTable.ON_UPDATE, function(event) {
			$.each(event.rows,function(){
				var row = this.data;
				var id = this.rowId;
				var gridRow = {};
				for(var filed in row){
					gridRow[filed] = row[filed].value;
				}
				gridRow['$_#_@_id'] = id;
				var index = oThis.grid.getRowIndexByValue('$_#_@_id',id);
				oThis.grid.updateRow(index,gridRow);
			})
			
		});		
		
		this.dataTable.on(u.DataTable.ON_VALUE_CHANGE, function(obj) {
	
			var id = obj.rowId;
			var index = oThis.grid.getRowIndexByValue('$_#_@_id',id);
			if(index == -1) {
				return;
			}
			var field = obj.field;
			var value = obj.newValue;
			oThis.grid.updateValueAt(index,field,value);
			
		});		
		
		// 删除行,只考虑viewModel传入grid
//		this.gridOptions.onRowDelete = function(obj){
//			dataTable.removeRow(obj.index);
//		};
		this.dataTable.on(u.DataTable.ON_DELETE, function(event) {
			/*index转化为grid的index*/
			var gridIndexs = new Array();
			$.each(event.rowIds, function() {
				var index = oThis.grid.getRowIndexByValue('$_#_@_id',this);
				gridIndexs.push(index);
			});
			oThis.grid.deleteRows(gridIndexs);
		});
		
		this.dataTable.on(u.DataTable.ON_DELETE_ALL, function(event) {
			oThis.grid.setDataSource({})
		});		
		
		// 数据改变
		var onValueChangeFun = this.gridOptions.onValueChange; 
		this.gridOptions.onValueChange = function(obj) {
			var row = oThis.getDataTableRow(oThis.grid.dataSourceObj.rows[obj.rowIndex].value)
			if(row){
				if($.type(obj.newValue) == 'object') {
					row.setValue(obj.field, obj.newValue.trueValue);
					row.setMeta(obj.field, 'display', obj.newValue.showValue);
				} else {
					row.setValue(obj.field,obj.newValue);
				}
			}
			if(onValueChangeFun){
				onValueChangeFun.call(oThis,obj);
			}
		};
		this.dataTable.on('valueChange', function(event) {
			var field = event.field,
				rowId = event.rowId,
				oldValue = event.oldValue,
				newValue = event.newValue;
			var rowIndex = oThis.grid.getRowIndexByValue('$_#_@_id',rowId);
			if(rowIndex > -1){
				oThis.grid.updateValueAt(rowIndex,field,newValue);	
			}
		});
		// 加载数据,只考虑viewModel传入grid
		this.dataTable.on(u.DataTable.ON_LOAD, function(data) {
			if(data.length > 0){
				var values = new Array();
				
				$.each(data, function() {
					var value = {};
					var dataObj = this.data;
					var id = this.rowId;
					for(var p in dataObj){
						var v = dataObj[p].value;
						value[p] = v;
					} 
					value['$_#_@_id'] = id;
					values.push(value);
				});
				var dataSource = {};
				dataSource['values'] = values;
				oThis.grid.setDataSource(dataSource);
			}
		});
		this.dataTable.on(u.DataTable.ON_ENABLE_CHANGE, function(enable) {		
			oThis.grid.setEditable(enable.enable);
		});

		this.dataTable.on(u.DataTable.ON_ROW_META_CHANGE, function(event){
			var field = event.field,
				meta = event.meta,
				row = event.row,
				newValue = event.newValue
			if (meta == 'required'){
				oThis.grid.setRequired(field, newValue)
			}
			if (meta == 'precision'){
				var comp = oThis.editComponent[field];
				if(comp) {
					comp.setPrecision(newValue)
				}

				var index = oThis.grid.getRowIndexByValue('$_#_@_id',row.rowId);
				if(index == -1) {
					return;
				}
				var value = row.getValue(field)

				oThis.grid.updateValueAt(index,field,value,true);
			}
		})

		this.dataTable.on(u.DataTable.ON_META_CHANGE, function(event){
			var field = event.field
			var meta = event.meta
			if (meta == 'precision'){
				oThis.grid.renderTypeFun({field:field})
			}
		})
		// 创建grid
		this.grid = $(element).grid(this.gridOptions);
		this.grid.dataTable = this.dataTable
		this.grid.viewModel = viewModel
		this.grid.gridModel = this
		
		
		
		//如果先插入数据再创建grid需要处理 load
		var data = this.dataTable.rows(); 
		if(data.length > 0){
			var values = new Array();
				
			$.each(data, function() {
				var value = {};
				var dataObj = this.data;
				var id = this.rowId;
				for(var p in dataObj){
					var v = dataObj[p].value;
					value[p] = v;
				} 
				value['$_#_@_id'] = id;
				values.push(value);
			});
			var dataSource = {};
			dataSource['values'] = values;
			oThis.grid.setDataSource(dataSource);
		}
		// 选中行
		var selectIndexs = this.dataTable.getSelectedIndexs();
		if(selectIndexs.length > 0){
			$.each(selectIndexs, function() {
				oThis.grid.setRowSelect(this);	
			});
		}
		
		return this;
	},
	
	getName: function() {
		return 'grid'
	},
	
	
	/**
	 * 获取grid行对应的数据模型行对象
	 * @param {Object} gridRow
	 */
	getDataTableRow: function(gridRow){
		var rowId =  gridRow['$_#_@_id']
		var row = null
		var rowIndex = this.dataTable.getIndexByRowId(rowId)
		if(rowIndex > -1)
			row = this.dataTable.getRow(rowIndex);
		return row
	},
	
	setEnable: function(enable){
		this.grid.setEditable(enable);
	},
	
	setShowHeader: function(showHeader){
		this.grid.setShowHeader(showHeader);
	},
	
	// 传入要编辑的tr对应的jquery对象
	editRowFun: function(index){
		this.dataTable.setRowSelect(index);
		this.grid.editRowIndexFun(index);
	}
});

	//if ($.compManager)
	//	$.compManager.addPlug(Grid)


u.compMgr.addDataAdapter(
    {
        adapter: u.GridAdapter,
        name: 'grid'
        //dataType: 'float'
    })