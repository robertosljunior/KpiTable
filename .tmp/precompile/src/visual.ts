

module powerbi.extensibility.visual.PBI_CV_19182E25_A94F_4FFD_9E99_89A73C9944FD  {

    export class Visual implements IVisual {

        /**
         * VARS
         */
        private target: d3.Selection<HTMLElement>;
        private table: d3.Selection<HTMLElement>;
        private tHead: d3.Selection<HTMLElement>;
        private tBody: d3.Selection<HTMLElement>;
        private div: d3.Selection<HTMLElement>;
        public dataViewModel: strucData.ITableViewModel;
        private selectionManager: ISelectionManager;
        private host: IVisualHost;
        private tableOptions: strucData.IOptions;
        private static config: strucData.IConfig[];
        private width: number;
        private height: number;
        private init: boolean = true;
        private dataview: DataView;
        private selectionIds: any = {};
        private select: boolean = false;
        private rowSelected: number[] = [];
        private containerOption: d3.Selection<HTMLElement>;
        private Option: d3.Selection<HTMLElement>;



        /**
         * CONSTRUCTOR OF VISUAL 
         */
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.target = d3.select(options.element);
            this.selectionManager = options.host.createSelectionManager();
            this.cleanDataModel();
            this.InitconfigHTML();
            Visual.config = [];

        }

        /**
         * UPDATE OF VISUAL  
         */
        @logExceptions()
        public update(optionsUpdate: VisualUpdateOptions) {


            STYLE.Customize.events(optionsUpdate.viewMode, this.Option, this.div);
            if (optionsUpdate.type == VisualUpdateType.Data || optionsUpdate.type == VisualUpdateType.All || (optionsUpdate.viewport.height == this.height && optionsUpdate.viewport.width == this.width)) {
                if (optionsUpdate.dataViews[0]) {
                    this.dataview = optionsUpdate.dataViews[0];

                    if (Visual.config.length == 0) {
                        try {
                            if (COMMON.Core.getConfig(optionsUpdate.dataViews).length == 0) {
                                Visual.config = JSON.parse(getValue(this.dataview.metadata.objects, "Settings", "config", "[]"));
                            } else {
                                //  Visual.config = COMMON.Core.getConfig(optionsUpdate.dataViews); json config retired
                            }
                        } catch (Error) { Visual.config = []; }
                    }

                    this.parseData();
                    this.tableStyling();
                    STYLE.Customize.setHTML(this.Option, this.dataViewModel);
                    this.configPopup();
                }
            }

            this.height = optionsUpdate.viewport.height;           //update height 
            this.width = optionsUpdate.viewport.width;            //update width




            this.highlights();
            this.selected();
            this.resetConfig();
            d3.select("select[name='typeCol']").on("change", this.changeType.bind(this));
            d3.select("select[name='cols']").on("change", this.setConfigEvents.bind(this));


        }
        /**
         * selected row
         */
        private selected() {
            if (this.select) {
                d3.selectAll(".fixed_headers tr").classed("select-table", true);
                this.rowSelected.forEach(item => {
                    d3.select(".select-table" + item).
                        style("font-weight", "bold")
                        .classed("select-table", false);
                });
            }
        }
        /**
         * highlights
         */
        private highlights() {
            let i, itens: number[] = [];
            if (!this.dataview || !this.dataview.categorical || !this.dataview.categorical.values) return;
            this.dataview.categorical.values.forEach(item => {
                if (item.highlights) {
                    i = 0;
                    item.highlights.forEach(val => {

                        if (val != null) {
                            if (!_.contains(itens, i)) {
                                itens.push(i);
                            }
                        }
                        i++;
                    });
                }

            });

            if (itens.length != 0) {
                this.rowSelected = [];
                this.select = false;
                d3.selectAll(".fixed_headers tr").classed("select-table", true);
                itens.forEach(item => {
                    d3.select(".select-table" + item).style("font-weight", "bold").classed("select-table", false);
                });
            }

        }
        /**
         * parse data to dataviewmodel 
         */
        private parseData() {

            //valid?  // exist?
            if (!this.dataview
                || !this.dataview.categorical
                || !this.dataview.categorical.categories
            )
                return;
            this.cleanDataModel();
            this.setHeaders();                                  //set headers of collumns
            this.setConfigColumns();                            //set config columns in dataview model
            this.setRows();                                     //set values of rows
            this.drawTable();                                   //draw table
        }

        /**
         * set headers of collumns 
         */
        private setHeaders() {

            let data = this.dataview.categorical.values;
            let rows = this.dataview.categorical.categories;
            //insert header row
            rows.forEach(item => {
                if (item.source.roles["rows"]) {
                    this.dataViewModel.columns.push({
                        name: item.source.displayName,
                        iconType: strucData.IconType.TEXT,
                        type: strucData.Type.NOTHING,
                        icon: [],
                        polarityColumn: "",
                        compare: ""
                    });
                }

            });


            if (!data) { Visual.config = []; this.enumerateObjectInstances({ objectName: "Settings" }); return; }
            //insert header values
            data.forEach(item => {
                var i = 0, type;
                if (_.findIndex(this.dataViewModel.columns, { name: item.source.displayName }) < 0) {
                    this.dataViewModel.columns.push({
                        name: item.source.displayName,
                        iconType: strucData.IconType.TEXT,
                        type: strucData.Type.NOTHING,
                        icon: [],
                        polarityColumn: "",
                        compare: ""
                    });

                    i++;
                }

            });

        }
        /**
         * get values 
         */
        private setRows() {
            let data = this.dataview.categorical.values;
            let indicator = COMMON.Core.getIndicator(this.dataview.categorical.categories);
            let polarity = COMMON.Core.getPolarity(this.dataview.categorical.categories);
            this.dataViewModel.polarity = polarity;
            let colsLenght = this.dataViewModel.columns.length - 1;//4
            let type;
            let row = { id: null, row: [] };
            let i = 0, j = 0, pol, other, colPol;

            if (!data) {
                indicator.forEach(item => {
                    row = { id: null, row: [] };
                    row.row.push({ value: item, polarity: 1 });
                    row.id = j;
                    this.selectionIds[item] = this.host.createSelectionIdBuilder()
                        .withCategory(this.dataview.categorical.categories[0], j)
                        .createSelectionId();
                    this.dataViewModel.values.push(row);
                    j++;
                });
                return;
            }
            j = 0;
            let rowsLength = data.length / colsLenght;//8

            data.forEach(item => {

                if (i % colsLenght == 0) {
                    if (polarity.length < 1) {
                        polarity = [{ name: "", values: [] }];
                    }

                    row = { id: null, row: [] };
                    row.row.push({ value: indicator[j], polarity: 1 });
                    row.id = j;
                    this.selectionIds[indicator[j]] = this.host.createSelectionIdBuilder()
                        .withCategory(this.dataview.categorical.categories[0], j)
                        .createSelectionId();

                }
                colPol = this.dataViewModel.columns[(i % colsLenght) + 1].polarityColumn;

                pol = _.findIndex(this.dataViewModel.polarity, { name: colPol });
                type = this.dataViewModel.columns[(i % colsLenght) + 1].type;
                if (pol != -1) {
                    other = polarity[pol].values[j];
                } else {
                    if (colPol == "1") {
                        other = 1;
                    } else {
                        other = 0;
                    }
                }
                row.row.push(
                    this.setConfigCell(type, item.values[j], (i % colsLenght) + 1, other)
                );
                if (i % colsLenght == colsLenght - 1) {
                    this.dataViewModel.values.push(row);
                    j++;
                }
                i++;
            });

        }
        /**
         * config valid value
         */
        private setConfigCell(type: any, value: any, k: number, pol: any) {

            let score, iconType;
            let row = { value: null, polarity: 1 };
            if (value == null || value == undefined) { return row; }
            if (type == strucData.Type.SCORE) { //SCORE
                iconType = this.dataViewModel.columns[k].iconType;
                score = COMMON.Core.getScore(+value);

                if (iconType == strucData.IconType.ICON) {

                    row.value = this.dataViewModel.columns[k].icon[score];

                } else if (iconType == strucData.IconType.ICONTEXT) {

                    row.value = COMMON.Core.formatNumber(<any>value)
                        + " " + this.dataViewModel.columns[k].icon[score];
                } else {
                    row.value = value;
                }
            } else if (type == strucData.Type.VARIATION || type == strucData.Type.COMPARE) { //type variation
                row.value = value;
                row.polarity = pol;
            } else {
                row.value = value;
            }

            return row;
        }
        /**
       * set config columns in dataview model 
       */
        private setConfigColumns() {
            let config = Visual.config;
            var id;

            if (config.length > 0) {

                _.each(config, item => {

                    id = _.findIndex(this.dataViewModel.columns, { name: item.columnName });
                    if (id == -1) { return; }
                    if (item.typeColumn.toUpperCase() == "SCORE") {
                        try {
                            this.dataViewModel.columns[id].icon = ICON.ShapeFactory.getShape(item.iconType);
                            this.dataViewModel.columns[id].type = strucData.Type.SCORE;

                            switch (item.visualValue.toUpperCase()) {
                                case 'ICON':
                                    this.dataViewModel.columns[id].iconType = strucData.IconType.ICON;
                                    break;
                                case 'ICONTEXT':
                                    this.dataViewModel.columns[id].iconType = strucData.IconType.ICONTEXT;
                                    break;
                                default:
                                    this.dataViewModel.columns[id].iconType = strucData.IconType.TEXT;
                                    break;
                            }

                        } catch (Error) { throw new Error("type column name no match"); }

                    } else if (item.typeColumn.toUpperCase() == "VARIATION") {

                        this.dataViewModel.columns[id].type = strucData.Type.VARIATION;
                        this.dataViewModel.columns[id].polarityColumn = item.columnPolarity;
                    } else if (item.typeColumn.toUpperCase() == "COMPARE") {
                        this.dataViewModel.columns[id].icon = ICON.ShapeFactory.getShape(item.iconType);
                        this.dataViewModel.columns[id].type = strucData.Type.COMPARE;
                        this.dataViewModel.columns[id].compare = item.compare;
                        this.dataViewModel.columns[id].polarityColumn = item.columnPolarity;
                    } else { }
                });
            }


        }
        /**
         * draw table to my target 
         */
        private drawTable() {

            if (this.dataViewModel.columns.length < 1) { return; }

            //if exists, remove existing table
            this.target.select("table[class='fixed_headers1']").remove();
            this.target.select("table[class='fixed_headers']").remove();
            this.target.select("div[class='test']").remove();
            // get columns and values
            var columns = this.dataViewModel.columns;
            var values = this.dataViewModel.values;

            //init table
            this.table = this.div.append('table')
                .classed("fixed_headers1", true).attr("cellspacing", "0").attr("cellpadding", "0");


            this.tHead = this.table.append('thead');


            this.tHead.selectAll('th').data(columns)
                .enter()
                .insert('th')
                .html(function (column) { return column.name; });
            //

            var tableBody = this.div.append('div').classed("test", true).append('table')
                .classed("fixed_headers", true).attr("cellspacing", "0").attr("cellpadding", "0");
            //
            this.tBody = tableBody.append('tbody');

            var rows = this.tBody.selectAll("tr")
                .data(values)
                .enter()
                .append("tr")
                .attr("class", function (d, i) {
                    return "select-table" + i;
                });

            var cells = rows.selectAll('td')
                .data(function (row) {
                    return columns.map(
                        function (column, i) {
                            return { column: column, value: row.row[i].value, type: column.type, polarity: row.row[i].polarity, id: row.id };
                        });
                })
                .enter()
                .append('td')
                .style("padding-right", function (d) {
                    if (STYLE.Customize.isIcon(d.value)) {
                        return "50px";
                    }
                })
                .style('color', function (d) {

                    if (d.type == strucData.Type.VARIATION || d.type == strucData.Type.COMPARE && d.polarity != undefined && d.polarity != null) {

                        return COMMON.Core.getVariation(d.value, d.polarity);
                    }

                })
                .html(function (d, i) {

                    if (d.value == null) { return ""; }

                    if (d.type == strucData.Type.VARIATION && d.polarity != undefined && d.polarity != null) {
                        let value = COMMON.Core.getVariation(d.value, d.polarity);

                        if (value == "green") {
                            return COMMON.Core.formatNumber(<any>d.value) + " " + ICON.ShapeFactory.getShape("BulletWhite")[2];
                        } else if (value == "red") {
                            return COMMON.Core.formatNumber(<any>d.value) + " " + ICON.ShapeFactory.getShape("BulletWhite")[0];
                        } else {
                            return COMMON.Core.formatNumber(<any>d.value) + " " + ICON.ShapeFactory.getShape("BulletWhite")[1];
                        }
                    } else if (d.type == strucData.Type.COMPARE) {

                        let colComapre = columns[i].compare;
                        let compareColumn = _.findIndex(columns, { name: colComapre });

                        if (d.value > values[d.id].row[compareColumn].value) {
                            return COMMON.Core.formatNumber(<any>d.value) + " " + ICON.ShapeFactory.getShape("ARROW")[0];
                        } else if (d.value < values[d.id].row[compareColumn].value) {
                            return COMMON.Core.formatNumber(<any>d.value) + " " + ICON.ShapeFactory.getShape("ARROW")[2];
                        } else {
                            return COMMON.Core.formatNumber(<any>d.value) + " " + ICON.ShapeFactory.getShape("ARROW")[1];
                        }
                    } else {
                        return COMMON.Core.formatNumber(<any>d.value);
                    }

                });

           this.selectRow(rows);

        }
        /**
         * interact each other visuals
         * @param rows 
         */
        private selectRow(rows:any){
             rows.on('click', function (d) {
                let key = false, index;

                this.selectionManager.select(this.selectionIds[d.row[0].value], true).then((ids: ISelectionId[]) => {

                    if (<MouseEvent>d3.event) {
                        if ((<MouseEvent>d3.event).ctrlKey) {
                            key = true;
                        }
                    }
                    
                    if (ids.length == 1 && !key) {
                        if (this.rowSelected.length > 1) {
                            this.selectionManager.clear();
                            this.selectionManager.select(this.selectionIds[d.row[0].value], true).then((ids: ISelectionId[]) => {
                                this.select = true;
                                this.rowSelected = [];
                                this.rowSelected.push(d.id);
                            });
                        } else {
                            this.rowSelected = [];
                            this.select = true;
                            this.rowSelected.push(d.id);
                        }


                    } else if (ids.length == 1 && key) {

                        this.select = true;
                        index = this.rowSelected.indexOf(d.id);

                        if (index != -1) {
                            this.rowSelected.splice(index, 1);
                        } else {
                            this.rowSelected.push(d.id);
                        }
                    }
                    else if (ids.length >= 1 && !key) {

                        this.rowSelected = [];
                        this.selectionManager.clear();

                        this.selectionManager.select(this.selectionIds[d.row[0].value], true).then((ids: ISelectionId[]) => {
                            this.select = true;
                            this.rowSelected.push(d.id);
                        });

                    } else if (ids.length > 1 && key) {

                        this.select = true;
                        index = this.rowSelected.indexOf(d.id);

                        if (index != -1) {
                            this.rowSelected.splice(index, 1);
                        } else {
                            this.rowSelected.push(d.id);
                        }

                    }
                    else {
                        this.select = false;
                        this.rowSelected = [];
                    }
                });
                this.selectionManager.applySelectionFilter();

            }.bind(this));
        }
        /**
         * Enumerates through the objects defined in the capabilities and adds the properties to the format pane
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {

            let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];
            let objectEnumeration1: VisualObjectInstance[] = [];

            var _ = this.tableOptions;

            switch (objectName) {
                case 'TableOptions':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            fontSize: _.fontSize,
                            color: _.color,
                            colorFont: _.colorFont
                        },
                        selector: null
                    });
                    break;
                case 'RowsFormatting':
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            fontSize: _.rowsFont,
                            fontFamily: _.rowsFamily,
                            rowBackground: _.rowsBackground
                        },
                        selector: null
                    });
                    break;

            };

            let config: VisualObjectInstance = {

                objectName: "Settings",
                properties: {
                    config: JSON.stringify(Visual.config),
                    show: getValue(this.dataview.metadata.objects, "Settings", "show", true)
                },
                selector: null
            }
            objectEnumeration1.push(config);

            let propertToChange: VisualObjectInstancesToPersist = {
                merge: objectEnumeration1
            }
            this.host.persistProperties(objectEnumeration1);

            return objectEnumeration;
        }
        /**
         * clear all configs
         */
        private resetConfig() {
            d3.select("button[id='resetButton']").on('click', function () {
                Visual.config = [];
                d3.select("select[name='typeCol']").property("value", "none");
                this.enumerateObjectInstances({ objectName: "Settings" });
            }.bind(this));
        }
        /**
         * popup configs
         */
        private configPopup() {
            let colOther, iconType, colName, typeCol, compare;

            d3.select("button[id='configButton']").on('click', function () {


                d3.select("select[name='cols']")
                    .selectAll("option")
                    .filter(function (d, i) {
                        if (this.selected) {
                            colName = this.value;
                            return this.value;
                        }
                    });
                d3.select("select[name='typeCol']")
                    .selectAll("option")
                    .filter(function (d, i) {
                        if (this.selected) {
                            typeCol = this.value;
                            return this.value;
                        }
                    });

                let id = _.findIndex(Visual.config, { columnName: colName });

                if (typeCol == "variation") {
                    if (id != -1) { Visual.config.splice(id, 1) };

                    d3.select("select[name='polarity']").selectAll("option")
                        .filter(function (d, i) {
                            if (this.selected) {
                                colOther = this.value;
                                return this.value;
                            }
                        });

                    Visual.config.push({
                        columnName: colName,
                        typeColumn: "VARIATION",
                        iconType: "",
                        visualValue: "",
                        columnPolarity: colOther,
                        compare: ""
                    });

                } else if (typeCol == "score") {
                    if (id != -1) { Visual.config.splice(id, 1) };

                    d3.select("select[name='typeIcon']").selectAll("option")
                        .filter(function (d, i) {
                            if (this.selected) {
                                iconType = this.value;
                                return this.value;
                            }
                        });
                    Visual.config.push({
                        columnName: colName,
                        typeColumn: "SCORE",
                        iconType: "BULLET",
                        visualValue: iconType,
                        columnPolarity: "",
                        compare: ""
                    });

                } else if (typeCol == "compare") {

                    if (id != -1) { Visual.config.splice(id, 1) };

                    d3.select("select[name='compare']").selectAll("option")
                        .filter(function (d, i) {
                            if (this.selected) {
                                compare = this.value;
                                return this.value;
                            }
                        });
                    d3.select("select[name='polarity']").selectAll("option")
                        .filter(function (d, i) {
                            if (this.selected) {
                                colOther = this.value;
                                return this.value;
                            }
                        });

                    Visual.config.push({
                        columnName: colName,
                        typeColumn: "COMPARE",
                        iconType: "ARROW",
                        visualValue: "icontext",
                        columnPolarity: colOther,
                        compare: compare
                    });

                } else { if (id != -1) { Visual.config.splice(id, 1) }; }
                d3.select("select[name='typeCol']").property("value", "none");
                this.enumerateObjectInstances({ objectName: "Settings" });



            }.bind(this));
        }
        /**
        * styling table
        */
        private tableStyling() {

            this.tableOptions = {
                fontSize: getValue(this.dataview.metadata.objects, "TableOptions", "fontSize", 14),
                color: getValue<Fill>(this.dataview.metadata.objects, "TableOptions", "color", { solid: { color: "white" } }).solid.color,
                colorFont: getValue<Fill>(this.dataview.metadata.objects, "TableOptions", "colorFont", { solid: { color: "black" } }).solid.color,
                rowsFont: getValue(this.dataview.metadata.objects, "RowsFormatting", "fontSize", 14),
                rowsFamily: getValue(this.dataview.metadata.objects, "RowsFormatting", "fontFamily", "Segoe UI Light"),
                rowsBackground: getValue<Fill>(this.dataview.metadata.objects, "RowsFormatting", "rowBackground", { solid: { color: "white" } }).solid.color
            };
            STYLE.Customize.setFontsize(this.tHead, this.tableOptions.fontSize);
            STYLE.Customize.setColor(this.tHead, this.tableOptions.color);
            STYLE.Customize.setColorFont(this.tHead, this.tableOptions.colorFont);
            STYLE.Customize.setSizerFont(this.tBody, this.tableOptions.rowsFont);
            STYLE.Customize.setFamily(this.tBody, this.tableOptions.rowsFamily);
            STYLE.Customize.setRowBackground(this.tBody, this.tableOptions.rowsBackground);
        }
        /**
         * maping config columns
         */
        private changeType() {
            STYLE.Customize.changeType(this.dataViewModel);
        }
        /**
         * set avaiable configs
         */
        private setConfigEvents() {
            STYLE.Customize.setConfigEvents(this.dataViewModel, Visual.config);
        }
        /**
        * init html and events
        */
        private InitconfigHTML() {

            this.div = this.target.append('div')
                .classed('wrapper', true);

            this.div.append('div').classed('edit', true);
            //
            this.Option = this.div.append('div').classed('option', true);
            this.containerOption = this.Option.append('div').classed("header", true).text("Config Columns")
                .append("span").classed('close1', true).html('&times;');
            this.Option.append("div").classed("container", true);
        }
        /**
      * clear data model
      */
        private cleanDataModel() {
            this.dataViewModel = {
                columns: [],
                values: [],
                polarity: []
            };
        }
        /**
         * DESTROY 
         */
        public destroy() { }

    }
}