(function () {
	'use strict';
	var csInterface = new CSInterface(); 
	function init() {
		themeManager.init(); 
		$("#aply").click(function () { 
			var result = window.cep.fs.showOpenDialog(false, false, "Test Dialog", "", ["png", "jpg"]);
			alert(result.data);
		});










		
	}
	init();
}());

