(function() {
    function toDataURL(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("get", url);
        xhr.responseType = "blob";
        xhr.onload = function() {
            var fr = new FileReader();

            fr.onload = function() {
                callback(this.result);
            };

            fr.readAsDataURL(xhr.response); // async call
        };

        xhr.send();
    }

    function loadFile(path, cb) {
        function reqListener() {
            cb(this.responseText);
        }

        var oReq = new XMLHttpRequest();
        oReq.addEventListener("load", reqListener);
        oReq.open("GET", path);
        oReq.send();
    }
    function attributes(element) {
        var attrs = [];
        for (let index = 0; index < element.attributes.length; index++) {
            attrs.push(element.attributes[index]);
        }
        return attrs;
    }
    function stringifyAttributes(attributes) {
        if (!attributes.length) {
            return "";
        }
        return ` ${attributes.map(t => `${t.name}="${t.value}"`).join(" ")}`;
    }
    function indent(depth) {
        let s = [];
        for (let index = 0; index < depth; index++) {
            s.push("\t");
        }
        return s.join("");
    }

    var tagsToInline = {
        script(element, resultsArray, cb) {
            return cb();
            // var result = { value: "" };
            // resultsArray.push(result);
            // if (element.src) {
            //     loadFile(element.src, function(scriptText) {
            //         var attrs = attributes(element).filter(
            //             t => t.name !== element.src
            //         );
            //         result.value = `<script${stringifyAttributes(
            //             attrs
            //         )}>${scriptText}</script>`;
            //         cb();
            //     });
            // } else {
            //     result.value = element.outerHTML;
            //     cb();
            // }
        },
        link(element, resultsArray, cb) {
            var result = { value: "" };
            resultsArray.push(result);
            loadFile(element.href, function(cssText) {
                result.value = `<style>${cssText}</style>`;
                cb();
            });
        },
        img(element, resultsArray, cb) {
            var result = { value: "" };
            resultsArray.push(result);
            if (element.src && element.src.indexOf(";base64,") === -1) {
                toDataURL(element.src, dataURL => {
                    var attrs = attributes(element).filter(
                        t => t.name !== element.src
                    );
                    result.value = `<img src="${dataURL}"${stringifyAttributes(
                        attrs
                    )}/>`;
                    cb();
                });
            } else {
                result.value = element.outerHTML;
                cb();
            }
        }
    };
    function inlineElement(element, resultsArray, cb, depth = 0) {
        if (!element) {
            return cb();
        }
        let tagName = element.tagName;
        var nodeType = element.nodeType;
        if (nodeType === element.TEXT_NODE) {
            resultsArray.push({ value: element.textContent });
            return cb();
        }
        if (nodeType !== element.ELEMENT_NODE) {
            return cb();
        }
        tagName = tagName.toLowerCase();
        if (tagsToInline[tagName]) {
            tagsToInline[tagName](element, resultsArray, cb);
        } else {
            var attrs = attributes(element);
            var value = `${indent(depth)}<${tagName}${stringifyAttributes(
                attrs
            )}>`;
            resultsArray.push({
                value: value
            });
            var index = element.childNodes.length;
            if (!index) {
                return cb();
            }
            var isDone = false;
            // console.log(value, index);
            function done() {
                index--;
                if (index === 0) {
                    isDone = true;
                    cb();
                }
            }
            for (var i = 0; i < element.childNodes.length; i++) {
                inlineElement(
                    element.childNodes[i],
                    resultsArray,
                    done,
                    depth + 1
                );
            }
            value = `${indent(depth)}</${tagName}>`;
            resultsArray.push({
                value: value
            });
            // console.log(value, index);
            setTimeout(function() {
                if (!isDone) {
                    console.warn(`${tagName} did not finish`);
                }
            }, 2000);
        }
    }
    window.browserInline = {
        inline(element, cb) {
            let resultsArray = [];
            inlineElement(element, resultsArray, () => {
                cb(resultsArray.map(t => t.value).join(""));
            });
        }
    };
})();
