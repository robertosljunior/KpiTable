declare module STYLE{}
module STYLE {

    export class Customize{

        /**
         * check icon -> styling
         */
       static isIcon(cell : string):boolean{
           var matcher = new RegExp("<svg");
           return matcher.test(cell);
       }
       /**
        * zoom of visual
        */
       static setZoom(target: d3.Selection<HTMLElement>, num: any) {
           target.select('div').style("font-Size", num + "px");
       }
       /**
        * set color headings
        */
       static setColor(tHead: d3.Selection<HTMLElement>, color: any) {
           if (tHead) {
               if (color == undefined || color == null) {
                    tHead.selectAll('th').style("background-color","#015c55");
               } else {
                    tHead.selectAll('th').style("background-color",color);
               }
           }


       }
    }
}