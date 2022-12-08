javascript:

/*Settings*/

/*World Settings*/
WORLD_SPPED = 2.0;
UNIT_SPEED = 1;

/*Market Settings*/
MARKET_STACK_TIME = 15; /*mins*/
MAX_WOOD_SELLRATE = 350;
MAX_CLAY_SELLRATE = 350;
MAX_IRON_SELLRATE = 350;
MIN_WOOD_BUYRATE = 900;
MIN_CLAY_BUYRATE = 900;
MIN_IRON_BUYRATE = 900;

/*scaverging setting*/
SCAVENGING_BLACK_LIST = '';
HOME_SPEAR = 0;
HOME_SWORD = 0;
HOME_AXE = 0;
HOME_LC = 800;
HOME_HC = 50;

/*recuiter setting*/
RECUITER_BLACK_LIST = '002 Shanghai';
AXE_RECUITER_COUNT=8;
LC_RECUITER_COUNT=3;
SPEAR_RECUITER_COUNT=3;
SWORD_RECUITER_COUNT=3;
HC_RECUITER_COUNT=1;

/*farm setting*/
FARM_BLACK_LIST = '';

/*notification setting*/
BOT_PROTECTION_NOTIFY_INTERVAL = 20; /*mins*/
MARKET_NOTIFY_INTERVAL = 20; /*mins*/
INCOMING_NOTIFY_INTERVAL = 2; /*mins*/


var player_id = getPlayerId();
var current_village_id = getCurrentVillageId();
var current_village_coord = getCurrentVillageCoord();
var VILLAGE_TIME = 'mapVillageTime'; 
var VILLAGES_LIST = 'mapVillagesList'; 
var TIME_INTERVAL = 60 * 60 * 1000; /*refresh map every 1 hour*/
var villages = [];
var barbarians = [];
var my_villages = [];/*['33456', 'RubeuSs+village', '521', '667', '10853312', '268', '0']*/

/* add smpt.js */
var smpt_script = document.createElement('script');
smpt_script.setAttribute('src','https://smtpjs.com/v3/smtp.js');
document.head.appendChild(smpt_script);

/* check map */
if (localStorage.getItem(VILLAGES_LIST) != null) {
    var mapVillageTime = parseInt(localStorage.getItem(VILLAGE_TIME));
	var data = localStorage.getItem(VILLAGES_LIST);
    villages = CSVToArray(data);
    findOwnandBarbarianVillages();
	if (Date.parse(new Date()) >= mapVillageTime + TIME_INTERVAL) {
        /* hour has passed, refetch village.txt*/
        fetchVillagesData();
    } 
} else {
    fetchVillagesData();
}
/* end check map*/

if (document.getElementById('popup_box_bot_protection') != null || document.getElementById('bot_check') != null ){
	sendNotification('bot_protection','Bot Protection!!!');
	throw new Error("bot_protection!");
}

incoming_checked =localStorage.getItem("incoming_checked");
last_incoming_count = localStorage.getItem("last_incoming_count");

if(incoming_checked == null){
	incoming_checked = 1;
}
if(last_incoming_count == null){
	last_incoming_count = 0;
}
cur_incomings_amount = parseInt(document.getElementById('incomings_amount').textContent);
if (cur_incomings_amount==0){
	localStorage.setItem('incoming_attacks_list',null);
	localStorage.setItem('incoming_checked',1);
}

if(cur_incomings_amount!=parseInt(last_incoming_count)){
	if(parseInt(document.getElementById('incomings_amount').textContent)>parseInt(last_incoming_count)){
		localStorage.setItem("incoming_checked", 0);
	}
	localStorage.setItem("last_incoming_count", document.getElementById('incomings_amount').textContent);
}

urlParams = new URLSearchParams(window.location.search);

if (localStorage.getItem("incoming_checked") == 0){
	if(urlParams.get("screen") == "overview_villages" && urlParams.get("mode") == "incomings" && urlParams.get("subtype") == "attacks"){
		console.log("go checkIncomings");
		checkIncomings();
		localStorage.setItem("incoming_checked", 1);
	}else{
		document.getElementById('incomings_cell').childNodes[1].click();
	}
	throw new Error("have_new_incomming!");
}

processThisStep();


function processThisStep(){
	if(urlParams.get("screen") != "am_farm"){
		localStorage.setItem("next_farm_index",0);
	}
	if (urlParams.get("screen") == "market" && urlParams.get("mode") == "exchange"){
		start_market_time = localStorage.getItem("start_market_time");
		
		if ( start_market_time == null){
			localStorage.setItem("start_market_time", new Date());
			start_market_time = new Date();
		}
		def_time = ((new Date().getTime() - new Date(start_market_time).getTime())/1000)/60;
		console.log(def_time);
		if(def_time < MARKET_STACK_TIME){
			checkMarket();
			return;
		}
	}else if(urlParams.get("screen") == "am_farm"){
		doAmFarm();
		return;
	}else if(urlParams.get("screen") == "place" && urlParams.get("mode") == "scavenge"){
		doScavenging();
		return;
	}else if(urlParams.get("screen") == "barracks"){
		recruitInBarracks();
	}else if(urlParams.get("screen") == "stable"){
		recruitInStable();
	}else if(urlParams.get("screen") == "main"){
		buildInMain();
	}else{
	}
	goToNextStep();
	
}

function goToNextStep(){
	if (urlParams.get("screen") == "market" && urlParams.get("mode") == "exchange"){
		goToAmfarm(my_villages[0][0]);
	}else if(urlParams.get("screen") == "am_farm"){ /*start step*/
		goToScavergePage(current_village_id);
	}else if(urlParams.get("screen") == "place" && urlParams.get("mode") == "scavenge"){ 
		goToBarracks(current_village_id);
	}else if(urlParams.get("screen") == "barracks"){ 
		goToStable(current_village_id);
	}else if(urlParams.get("screen") == "stable"){ 
		goToMain(current_village_id);
	}else if(urlParams.get("screen") == "main"){/*end step*/
		temp_villages_list = null;
		try {
			temp_villages_list = JSON.parse(localStorage.getItem("temp_villages_list"));
			if (temp_villages_list == null){
				localStorage.setItem("temp_villages_list", JSON.stringify(my_villages));
				temp_villages_list = JSON.parse(localStorage.getItem("temp_villages_list"));
			}
		} catch (e) {
			localStorage.setItem("temp_villages_list", JSON.stringify(my_villages));
			temp_villages_list = JSON.parse(localStorage.getItem("temp_villages_list"));
		}
		console.log(temp_villages_list);
		temp_villages_list = removeCurrentVillageFromList(temp_villages_list);
		console.log(temp_villages_list);
		if(temp_villages_list.length>0){
			var nextVillage = temp_villages_list[0];
			localStorage.setItem("temp_villages_list", JSON.stringify(temp_villages_list));
			goToAmfarm(nextVillage[0]);
		}else{
			localStorage.setItem("temp_villages_list", JSON.stringify(my_villages));
			goToMarketExchange(my_villages[0][0]);	
		}
	}else{
		goToAmfarm(current_village_id);
	}
}

function checkMarket(){
	wood_rate = parseInt(document.getElementById('premium_exchange_rate_wood').innerText);
	clay_rate = parseInt(document.getElementById('premium_exchange_rate_stone').innerText);
	iron_rate = parseInt(document.getElementById('premium_exchange_rate_iron').innerText);
	cur_wood_amount = parseInt(document.getElementById('wood').innerText);
	cur_clay_amount = parseInt(document.getElementById('stone').innerText);
	cur_iron_amount = parseInt(document.getElementById('iron').innerText);
	
	if(wood_rate <= MAX_WOOD_SELLRATE || clay_rate <= MAX_CLAY_SELLRATE || iron_rate <= MAX_IRON_SELLRATE || wood_rate >= MIN_WOOD_BUYRATE || clay_rate >= MIN_CLAY_BUYRATE || iron_rate >= MIN_IRON_BUYRATE){
		sendNotification('market_notify','Time To Trade!!!');
	}
}


function recruitInBarracks(){
	curVillageName = document.getElementById('menu_row2_village').textContent.trim();
	if(RECUITER_BLACK_LIST.includes(curVillageName)){
		return;
	}
	
	try {
		rows = document.getElementById('train_form').getElementsByClassName('row_a');
	
		if(rows[0].cells[0].getElementsByClassName('unit_link')[0].getAttribute('data-unit')=='spear' && parseInt(rows[0].cells[2].textContent.split('/')[1])>0){
			document.getElementById('spear_0').value = SPEAR_RECUITER_COUNT;
			document.getElementById('sword_0').value = SWORD_RECUITER_COUNT;
		}
		else{
			document.getElementById('axe_0').value = AXE_RECUITER_COUNT;
		}
		document.getElementsByClassName('btn btn-recruit')[0].click();
	}
	catch(err) {
	}
}

function recruitInStable(){
	curVillageName = document.getElementById('menu_row2_village').textContent.trim();
	if(RECUITER_BLACK_LIST.includes(curVillageName)){
		return;
	}
	try {
		rows = document.getElementById('train_form').getElementsByClassName('row_a');
	
		if(rows[1].cells[0].getElementsByClassName('unit_link')[0].getAttribute('data-unit')=='light' && parseInt(rows[1].cells[2].textContent.split('/')[1])>0){
			document.getElementById('light_0').value = LC_RECUITER_COUNT;
		}
		else{
			document.getElementById('heavy_0').value = HC_RECUITER_COUNT;
		}
		document.getElementsByClassName('btn btn-recruit')[0].click();
	}
	catch(err) {
	}
}

function buildInMain(){
	build_queue = document.getElementById('buildqueue');
	farm_percentage  = (parseInt(document.getElementById('pop_current_label').textContent) / parseInt(document.getElementById('pop_max_label').textContent))*100;
	
	
	if(build_queue == null){
		if( farm_percentage>95){
			document.getElementById('main_buildrow_farm').getElementsByClassName('btn btn-build')[0].click();
			
		}
		
	}
}

function doAmFarm(){
	curVillageName = document.getElementById('menu_row2_village').textContent.trim();
	if(FARM_BLACK_LIST.includes(curVillageName)){
		return;
	}
	try {
		index = parseInt(localStorage.getItem("next_farm_index"));
		master_table = document.getElementById('plunder_list');
		
		cur_row = master_table.rows[index+2];
		next_row = master_table.rows[index+3];
		
		attackBarbar(cur_row);
		
		if(parseInt(document.getElementById('light').textContent) <parseInt(document.getElementsByName('light[10119]')[0].getAttribute('value'))){
			goToNextStep();
		}
		if(next_row == null){
			goToNextStep();
		}else{
			localStorage.setItem("next_farm_index",index+1);
		}
	}
	catch(err) {
		goToNextStep();
	}
	
}

function attackBarbar(row){
	a_element = row.getElementsByClassName('farm_icon_a')[0];
	b_element = row.getElementsByClassName('farm_icon_b')[0];
	if ( a_element.getAttribute('class').includes('farm_icon_disabled')==false){
		console.log('click');
		a_element.click();
	}else if ( b_element.getAttribute('class').includes('farm_icon_disabled')==false){
		console.log('click');
		b_element.click();
	}else{
		return;	
	}
	
	
}

function doScavenging(){
	curVillageName = document.getElementById('menu_row2_village').textContent.trim();
	if(SCAVENGING_BLACK_LIST.includes(curVillageName)){
		goToNextStep();
		return;
	}
	for(let cd of document.getElementsByClassName('return-countdown')){
		if (parseInt(cd.textContent.split(':')[0]) == 0 && parseInt(cd.textContent.split(':')[1])<11 ){
			goToNextStep();
			return;
		}
	}
	btns = document.getElementsByClassName('btn btn-default free_send_button');
	units = document.getElementsByClassName('units-entry-all squad-village-required');
	inputs = document.getElementsByClassName('unitsInput input-nicer');
	availableSpear=0;
	availableSword=0;
	availableAxe=0;
	availableLc=0;
	availableHc=0;
	spearInput = null;
	swordInput = null;
	axeInput = null;
	lcInput = null;
	hcInput = null;
	for(let unit of units) 
    {
		switch(unit.getAttribute('data-unit')){
			case 'spear':{
				availableSpear = parseInt(unit.textContent.split(')')[0].split('(')[1]);
				availableSpear -= HOME_SPEAR;
				if (availableSpear <0){
					availableSpear = 0;
				}
				break;
			}
			case 'sword':{
				availableSword = parseInt(unit.textContent.split(')')[0].split('(')[1]);
				availableSword -= HOME_SWORD;
				if (availableSword <0){
					availableSword = 0;
				}
				break;
			}
			case 'axe':{
				availableAxe = parseInt(unit.textContent.split(')')[0].split('(')[1]);
				availableAxe -= HOME_AXE;
				if (availableAxe <0){
					availableAxe = 0;
				}
				break;
			}
			case 'light':{
				availableLc = parseInt(unit.textContent.split(')')[0].split('(')[1]);
				availableLc -= HOME_LC;
				if (availableLc <0){
					availableLc = 0;
				}
				break;
			}
			case 'heavy':{
				availableHc = parseInt(unit.textContent.split(')')[0].split('(')[1]);
				availableHc -= HOME_HC;
				if (availableHc <0){
					availableHc = 0;
				}
				break;
			}
			default:{
				break;
			}
		}
    }
	
	for(let input of inputs){
		switch(input.getAttribute('name')){
			case 'spear':{
				spearInput = input;
				break;
			}
			case 'sword':{
				swordInput = input;
				break;
			}
			case 'axe':{
				axeInput = input;
				break;
			}
			case 'light':{
				lcInput = input;
				break;
			}
			case 'heavy':{
				hcInput = input;
				break;
			}
			default:{
				break;
			}
		}
	}

	
	switch(btns.length){
		case 4:{
			if(parseInt(availableSpear*0.077) + parseInt(availableSword*0.077) + parseInt(availableAxe*0.077) + parseInt(availableLc*0.077) + parseInt(availableHc*0.077) <10){
				goToNextStep();
			}
			simulate_keypress(spearInput, parseInt(availableSpear*0.077));
			simulate_keypress(swordInput, parseInt(availableSword*0.077));
			simulate_keypress(axeInput, parseInt(availableAxe*0.077));
			simulate_keypress(lcInput, parseInt(availableLc*0.077));
			simulate_keypress(hcInput, parseInt(availableHc*0.077));
			btns[3].click();
			return;
		}
		case 3:{
			if(parseInt(availableSpear*0.125) + parseInt(availableSword*0.125) + parseInt(availableAxe*0.125) + parseInt(availableLc*0.125) + parseInt(availableHc*0.125) <10){
				goToNextStep();
			}
			simulate_keypress(spearInput, parseInt(availableSpear*0.125));
			simulate_keypress(swordInput, parseInt(availableSword*0.125));
			simulate_keypress(axeInput, parseInt(availableAxe*0.125));
			simulate_keypress(lcInput, parseInt(availableLc*0.125));
			simulate_keypress(hcInput, parseInt(availableHc*0.125));
			btns[2].click();
			return;
		}
		case 2:{
			if(parseInt(availableSpear*0.285) + parseInt(availableSword*0.285) + parseInt(availableAxe*0.285) + parseInt(availableLc*0.285) + parseInt(availableHc*0.285) <10){
				goToNextStep();
			}
			simulate_keypress(spearInput, parseInt(availableSpear*0.285));
			simulate_keypress(swordInput, parseInt(availableSword*0.285));
			simulate_keypress(axeInput, parseInt(availableAxe*0.285));
			simulate_keypress(lcInput, parseInt(availableLc*0.285));
			simulate_keypress(hcInput, parseInt(availableHc*0.285));
			btns[1].click();
			return;
		}
		case 1:{
			if(parseInt(availableSpear) + parseInt(availableSword) + parseInt(availableAxe) + parseInt(availableLc) + parseInt(availableHc) <10){
				goToNextStep();
			}
			simulate_keypress(spearInput, parseInt(availableSpear));
			simulate_keypress(swordInput, parseInt(availableSword));
			simulate_keypress(axeInput, parseInt(availableAxe));
			simulate_keypress(lcInput, parseInt(availableLc));
			simulate_keypress(hcInput, parseInt(availableHc));
			btns[0].click();
			return;
		}
		default:{
			break;
		}
	}
	
	goToNextStep();
	
}

function simulate_keypress(input,value){
	input.value=value;
	input.dispatchEvent(new KeyboardEvent('keydown', {'key':'Shift'} ));
	input.dispatchEvent(new KeyboardEvent( 'keyup' , {'key':'Shift'} ));
}


function checkIncomings(){
	incomings_table = document.getElementById('incomings_table');
	notification_body="New incomings List: \n";
	

	for (let row of incomings_table.rows) {
		if(row.className.includes('nowrap')){
			command_id = row.cells[0].getElementsByClassName('quickedit')[0].getAttribute("data-id");
			distance = parseFloat(row.cells[4].textContent);
			arrivals_in = row.cells[6].textContent;
			arrivals_in = parseInt(arrivals_in.split(':')[0])*3600 + parseInt(arrivals_in.split(':')[1])*60 + parseInt(arrivals_in.split(':')[2]);
			arrivals_in= arrivals_in/60;
			
			incoming_attacks_list = localStorage.getItem("incoming_attacks_list");
			if(incoming_attacks_list==null || incoming_attacks_list.includes(command_id)==false){
				command_type = 'Scout';
				if (arrivals_in > distance * UNIT_SPEED * 9){
					command_type = 'LC_Pala_MA';
				}
				if (arrivals_in > distance * UNIT_SPEED * 10){
					command_type = 'HC';
				}
				if (arrivals_in > distance * UNIT_SPEED * 11){
					command_type = 'Spear_Axe_Archer';
				}
				if (arrivals_in > distance * UNIT_SPEED * 18){
					command_type = 'Sword';
				}
				if (arrivals_in > distance * UNIT_SPEED * 22){
					command_type = 'Ram_Cat';
				}
				if (arrivals_in > distance * UNIT_SPEED * 30){
					command_type = 'Noble';
				}
				/*change incomming comment*/
				row.cells[0].getElementsByClassName('rename-icon')[0].click();
				renameMasterElement = row.cells[0].getElementsByClassName('quickedit-edit')[0];
				renameMasterElement.childNodes[0].value = command_type;
				renameMasterElement.childNodes[1].click();
				localStorage.setItem('incoming_attacks_list', incoming_attacks_list + '   \n' +command_id + ': ' + row.cells[5].textContent + '>> '+ command_type);
				notification_body+= row.cells[5].textContent + ' : ' + command_type +' \n';
			}
			
		}
	}
	sendNotification('incoming_notify', notification_body);
	
}


/*******************************************************/
function goToMarketExchange(village_id){
	localStorage.setItem("start_market_time", new Date());
	var url = new URL(window.location.href);
	var search_params = url.searchParams;
	search_params.set('village', village_id);
	search_params.set('screen', 'market');
	search_params.set('mode', 'exchange');
	url.search = search_params.toString();
	var new_url = url.toString();
	window.location.href = new_url;
}

function goToAmfarm(village_id){
	var url = new URL(window.location.href);
	var search_params = url.searchParams;
	search_params.set('village', village_id);
	search_params.set('screen', 'am_farm');
	search_params.delete('mode');
	url.search = search_params.toString();
	var new_url = url.toString();
	window.location.href = new_url;
	
}


function goToScavergePage(village_id){
	var url = new URL(window.location.href);
	var search_params = url.searchParams;
	search_params.set('village', village_id);
	search_params.set('screen', 'place');
	search_params.set('mode', 'scavenge');
	url.search = search_params.toString();
	var new_url = url.toString();
	window.location.href = new_url;
}

function goToBarracks(village_id){
	var url = new URL(window.location.href);
	var search_params = url.searchParams;
	search_params.set('village', village_id);
	search_params.set('screen', 'barracks');
	url.search = search_params.toString();
	var new_url = url.toString();
	window.location.href = new_url;
}


function goToStable(village_id){
	var url = new URL(window.location.href);
	var search_params = url.searchParams;
	search_params.set('village', village_id);
	search_params.set('screen', 'stable');
	url.search = search_params.toString();
	var new_url = url.toString();
	window.location.href = new_url;
}

function goToMain(village_id){
	var url = new URL(window.location.href);
	var search_params = url.searchParams;
	search_params.set('village', village_id);
	search_params.set('screen', 'main');
	url.search = search_params.toString();
	var new_url = url.toString();
	window.location.href = new_url;
}




function getCurrentVillageLcOrHcCountList(){
	result = 0;
	try {
		rows = document.getElementById('train_form').getElementsByClassName('row_a');
		for( row in rows){
			if(row.cells[0].getElementsByClassName('unit_link')[0].getAttribute('data-unit')=='light' && parseInt(row.cells[2].textContent.split('/')[1])>0){
				result = parseInt(row.cells[2].textContent.split('/')[0]);
			}else if(row.cells[0].getElementsByClassName('unit_link')[0].getAttribute('data-unit')=='heavy' && parseInt(row.cells[2].textContent.split('/')[1])>0){
				result = parseInt(row.cells[2].textContent.split('/')[0]);
			}
			
		}
	}
	catch(err) {
	}
	return result;
}


function getCurrentVillageCoord(){
	pageHeaderChildNodes = document.getElementsByTagName('head')[0].childNodes;
	for (let node_index in pageHeaderChildNodes){
		if ( pageHeaderChildNodes[node_index].textContent !=null){
			if(pageHeaderChildNodes[node_index].textContent.includes('display_name":"')){
				village_coord = pageHeaderChildNodes[node_index].textContent.split('display_name":"')[1].split(')')[0].split('(')[1];
				return village_coord;
			}
		}
		
	}	
}


function getCurrentVillageId(){
	pageHeaderChildNodes = document.getElementsByTagName('head')[0].childNodes;
	for (let node_index in pageHeaderChildNodes){
		if ( pageHeaderChildNodes[node_index].textContent !=null){
			if(pageHeaderChildNodes[node_index].textContent.includes('village":{"id":')){
				village_id = pageHeaderChildNodes[node_index].textContent.split('village":{"id":')[1].split(',')[0];
				return village_id;
			}
		}
		
	}	
}


function getPlayerId(){
	pageHeaderChildNodes = document.getElementsByTagName('head')[0].childNodes;
	for (let node_index in pageHeaderChildNodes){
		if ( pageHeaderChildNodes[node_index].textContent !=null){
			if(pageHeaderChildNodes[node_index].textContent.includes('player":{"id":')){
				player_id = pageHeaderChildNodes[node_index].textContent.split('player":{"id":')[1].split(',')[0];
				return player_id;
			}
		}
		
	}	
}


function fetchVillagesData() {
    $.get('map/village.txt', function (data) {
        villages = CSVToArray(data);
        localStorage.setItem(VILLAGE_TIME, Date.parse(new Date()));
        localStorage.setItem(VILLAGES_LIST, data);
    })
        .done(function () {
            findOwnandBarbarianVillages();
        })
        .fail(function (error) {
            console.error(`${scriptInfo()} Error:`, error);
        });
}

function findOwnandBarbarianVillages() {
    villages.forEach((village) => {
        if (village[4] == '0') {
            barbarians.push(village);
        }else if (village[4] == player_id){
			my_villages.push(village);
		}
    });
}

function nearSafeBarbs(radius,dangerBarbsCord){
	result = nearBarbs(radius, 0, 5000);
	
	return result;
}

function nearBarbs(radius, minPoints, maxPoints) {
	
    const filteredBarbs = barbarians.filter((barbarian) => {
        return barbarian[5] >= minPoints && barbarian[5] <= maxPoints;
    });

    const filteredByRadiusBarbs = filteredBarbs.filter((barbarian) => {
        var barbCoord = barbarian[2] + '|' + barbarian[3];
        var distance = calculateDistance(current_village_coord, barbCoord);
        if (distance <= radius) {
            return barbarian;
        }
    });
	return filteredByRadiusBarbs;
}

function calculateDistance(from, to) {
    const [x1, y1] = from.split('|');
    const [x2, y2] = to.split('|');
    const deltaX = Math.abs(x1 - x2);
    const deltaY = Math.abs(y1 - y2);
    let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    distance = distance.toFixed(2);
    return distance;
}

function CSVToArray(strData, strDelimiter) {
    strDelimiter = strDelimiter || ',';
    var objPattern = new RegExp(
        '(\\' +
            strDelimiter +
            '|\\r?\\n|\\r|^)' +
            '(?:"([^"]*(?:""[^"]*)*)"|' +
            '([^"\\' +
            strDelimiter +
            '\\r\\n]*))',
        'gi'
    );
    var arrData = [[]];
    var arrMatches = null;
    while ((arrMatches = objPattern.exec(strData))) {
        var strMatchedDelimiter = arrMatches[1];
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
        ) {
            arrData.push([]);
        }
        var strMatchedValue;

        if (arrMatches[2]) {
            strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
        } else {
            strMatchedValue = arrMatches[3];
        }
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    return arrData;
}

function removeCurrentVillageFromList(v_list){

	result = [];
	
	
	v_list.forEach((village) => {
        if (village[0] != current_village_id) {
			result.push(village);
		}
    }); 
	
	return result;
	
}
MARKET_NOTIFY_INTERVAL = 20; /*mins*/
INCOMING_NOTIFY_INTERVAL = 2; /*mins*/

function sendNotification(type,data){
	now = new Date();
	bp_last_notify_time = localStorage.getItem("bp_last_notify_time");
	market_last_notify_time = localStorage.getItem("market_last_notify_time");
	incoming_last_notify_time = localStorage.getItem("incoming_last_notify_time");
	
	if(type=='bot_protection'){
		if(isNaN(new Date(bp_last_notify_time))){
			sendErrorLessEmail(data);
			localStorage.setItem("bp_last_notify_time", now);
		}else{
			def_time = ((now.getTime() - new Date(bp_last_notify_time).getTime())/1000)/60;
			if(def_time>BOT_PROTECTION_NOTIFY_INTERVAL){
				sendErrorLessEmail(data);
				localStorage.setItem("bp_last_notify_time", now);
			}
		}
	}else if(type=='market_notify'){
		
		if(isNaN(new Date(market_last_notify_time))){
			sendErrorLessEmail(data);
			localStorage.setItem("market_last_notify_time", now);
		}else{
			def_time = ((now.getTime() -  new Date(market_last_notify_time).getTime())/1000)/60;
			if(def_time>MARKET_NOTIFY_INTERVAL){
				sendErrorLessEmail(data);
				localStorage.setItem("market_last_notify_time", now);
			}
		}
	}else if(type=='incoming_notify'){
		
		if(isNaN(new Date(incoming_last_notify_time))){
			sendErrorLessEmail(data);
			localStorage.setItem("incoming_last_notify_time", now);
		}else{
			def_time = ((now.getTime() -  new Date(incoming_last_notify_time).getTime())/1000)/60;
			if(def_time>MARKET_NOTIFY_INTERVAL){
				sendErrorLessEmail(data);
				localStorage.setItem("incoming_last_notify_time", now);
			}
		}
	}
}

function sendErrorLessEmail(bodyText){
	myTimeout = setTimeout(function (){   
		sendEmail(bodyText);
	}, 200);
	try {
		sendEmail(bodyText);
	}catch(err){
		return;
	}
	clearTimeout(myTimeout);
}

function sendEmail(bodyText) {
	Email.send({
		Host : "smtp.elasticemail.com",
		Username : "mortazavi91@gmail.com",
		Password : "7927813F8D12BC4B1FDF600CFAA72235AE61",
		To : 'mortazavi91@gmail.com',
		From : 'mortazavi91@gmail.com',
		Subject : "TW Alert",
		Body : bodyText
	}).then(
	);
	console.log('EmailSentSuccesfully');
}