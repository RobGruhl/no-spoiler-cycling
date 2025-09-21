
function default_onload() {
    var links = document.getElementsByTagName('a');
    //alert("entered window.onload");
    for (var i=0;i < links.length;i++) {
        if ((links[i].href.indexOf("http://www.steephill.tv") != 0 && links[i].hasAttribute("onclick") == false) || links[i].className.match(/steephill|photos|calendar/) != null) {
            //alert(links[i].href);
            links[i].onclick = click_track; 
        }
    }
    /*
		callback to the "subclass" method of this onload implementation. Instead of using the onload event handler in the body tag create a function in a script and assign it to the custom property window.body_onload so that it will be called at the end of this function. (Any body tag onload event handler will override this method.) This functionality eliminates the need to assign the same onload handler to every page but stills allows subclassing/inheriting the default behavior.
		window.body_onload = function() {
			alert("called body_onload");
		};		
    */
    //turnPage();
    if (window.turnPage)
    	turnPage();
    	//alert("yes");
	//document.body.scrollTop = document.documentElement.scrollTop = 0;
}

window.onload = default_onload;
country_code = null;
document.write('<script type="text/javascript" src="https://apis.google.com/js/plusone.js"></script>');

/* include the standard header if the <script>OMIT_LOGO_EMAIL_THIS=true;</script> code is not included
in the head element */
if (!window.OMIT_HEADER)
	header();
document.write('<iframe id="iClickTrack"  style="display:none;visibility:hidden;height:1px;"><\/iframe>'); 

function header() {
	email_this({include_logo:true, align:"left"});
}

function footer() {
	document.write('<br/>');
	email_this({include_logo:true, align:"center"});
	document.write('<br clear="all"/>');
	document.write('<blockquote><blockquote><blockquote><blockquote><b>Sharing These Photos:</b><br/>We have a very simple procedure for sharing these photos -- Individual photos may be posted on team and not-for-profit web sites provided they are unaltered and appropriately credited using (pasting) the following line of html directly underneath: <pre>photo: &lt;a href=\"http://www.steephill.tv\"&gt;steephill.tv&lt;/a&gt;</pre>Once posted you can <a name=\"conditions\" href=\"mailto:info@steephill.tv?subject=Photo usage notification&body=Here is link to your photo: \">send us an email</a> with a link to the photo(s).</blockquote></blockquote></blockquote></blockquote>');


}

function email_this(settings) {
	//var shtv_logo = shtv_logo || true;
	//var email_services = email_services || 3;
	var url = escape(document.URL);
	var title = escape(document.title.replace(/,/g, ' -'));
	
	if (settings.black) {
		bgcolor = "#000000"; // black
		//fgcolor = "#FFFFFF"; // white
		logo = "steephill_tv_logo21_black.gif";		
	}
	else {
		bgcolor = "#FFFFFF"; // white
		//fgcolor = "#000000"; // black
		//logo = "steephill-logo-150.jpg";	
		logo = "steephill_tv_logo21-200.gif";	
		
	}
	
	
	if (settings.include_logo) {
		document.write('<table bgcolor=\"'+bgcolor+'\" align=\"'+settings.align+'\"><tr><td>');
		
		document.write('<a href=\"/\"><img alt=\"steephill logo\" src=\"/img/'+logo+'\" align=\"left\" width=\"200\" xheight=\"100\" border=\"0\"/> <br/></td>');
	}
	
	
	if (settings.target)
		target = ' target="' + settings.target + '" ';
	else
		target = "";
	
	document.write('<td>');

	if (settings.align != "center") {
		document.write('&laquo; <a href=\"/\"' + target + '>steephill.tv home</a>');		
		if (settings.navigation_path)
			document.write(' > ' + settings.navigation_path);	
		document.write('&nbsp;&nbsp; &bull; &nbsp;&nbsp;'); 
	}


	document.write('<img alt=\"email\" src=\"/mailto.gif\" width=\"14\" height=\"10\"/> <a href=\"mailto:?subject=' + title  + '&body=' + url + '\" onclick=\"click_track(\'mailto:\')\">Email This</a>');
	
	document.write('&nbsp;&nbsp; &bull; &nbsp;&nbsp;'); 
	
	document.write('<img alt=\"y!\" src=\"/smilies/yahoo.gif\" align=\"top\" width=\"16\" height=\"16\"> <a href=\"http://compose.mail.yahoo.com/ym/Compose?To=&Subject=' + title + '&Body=' + url + '\"' + target +  'onclick=\"click_track(\'mail.yahoo.com\')\">  Mail This</a>');
	
	document.write('&nbsp;&nbsp; &bull; &nbsp;&nbsp;');
	
	document.write('<img alt=\"t\" src=\"/icons/twitter.gif\" align=\"top\" width=\"16\" height=\"16\"> <a href=\"http://twitter.com/home?status=checkout @steephill: ' + title + ':%20'+ url + '\"' + target + ' onclick=\"click_track(\'twitter.com\')\">  Tweet</a>');
	
	document.write('&nbsp;&nbsp; &bull; &nbsp;&nbsp;');
	
	document.write('<iframe align="top" src="http://www.facebook.com/plugins/like.php?href=' + url +'&amp;layout=button_count&amp;show_faces=true&amp;width=55&amp;action=like&amp;colorscheme=light&amp;height=21" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:52px; height:21px;" allowTransparency="true"></iframe>');
		
	/*
	document.write('<img alt=\"g\" src=\"/smilies/google.gif\" align=\"top\" width=\"16\" height=\"16\"> <a href=\"https://mail.google.com/mail?view=cm&tf=0&su=' + title + '&body=' + url + '\"' + target + ' onclick=\"click_track(\'mail.google.com\')\">  Mail This</a>');*/

	document.write('&nbsp;&nbsp; &bull; &nbsp;&nbsp;');
	
	document.write('<g:plusone size="small" count="false"></g:plusone>');
	
	document.write('&nbsp;&nbsp; &bull; &nbsp;&nbsp;');
	
	document.write("<a href=\"http://www.addthis.com/bookmark.php\" onclick=\"click_track_explicit(this.href);window.open('http://www.addthis.com/bookmark.php?pub=steephill&url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title), 'addthis', 'scrollbars=yes,menubar=no,width=620,height=520,resizable=yes,toolbar=no,location=no,status=no'); return false;\" title=\"Bookmark using any bookmark manager!\" target=\"_blank\"><img src=\"http://s7.addthis.com/static/btn/sm-share-en.gif\" width=\"83\" height=\"16\"  align=\"top\" alt=\"Bookmark and Share\" style=\"border:0\"/></a>");
	
	document.write('&nbsp;&nbsp; &bull; &nbsp;&nbsp;');
	
	document.write("<a href=\"http://feeds.feedburner.com/steephill\" title=\"Subscribe to my feed\"><img src=\"/img/icon_rss.png\" style=\"border:0\"/></a>");

	if (settings.include_logo) {	
		document.write("</td></tr></table>");
		//if (!window.OMIT_EMAILTHIS_BREAK)
			document.write('<br style="clear:both;"/>');

	}
}

// stores the reference to the XMLHttpRequest object
var xmlHttp = createXmlHttpRequestObject();
// retrieves the XMLHttpRequest object
function createXmlHttpRequestObject() {	
  // will store the reference to the XMLHttpRequest object
	var xmlHttp;
  // if running Internet Explorer
  if (window.ActiveXObject) {
	   try {
		  xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
	   }
	   catch (e) {
		 xmlHttp = false;
	   }
  }
  // if running Mozilla or other browsers
  else {
    try {
      xmlHttp = new XMLHttpRequest();
    }
    catch (e) {
      xmlHttp = false;
    }
  }
  return xmlHttp;
}


// make asynchronous HTTP request using the XMLHttpRequest object 
// the xmlHttp.onreadystatechange callback doesn't work for links

function click_track(e) {
	if (this.href)// handles formatting inside the anchor
		dest = this.href;
	else if (typeof(e.type) == "undefined") // check for an override string as parameter inside of event
		dest = e;
	else // otherwise use the anchor href attribute
		dest = e.target;
		
	// play video from the onclick event handler instead of the anchor if possible
	var jp = dest.toString().indexOf(":Play");
	if (jp != -1) {
		try {
			//alert(playFunc);
			var playFunc = dest.toString().substring(jp+1);
			eval(playFunc);
		}
		catch (e) {
			jp = -1; // try to play the video the old way... doesn't work with all browsers
			//alert(e);
		}
	}
	
	

	 params = "source=" + encodeURIComponent(document.URL) + "&destination=" + encodeURIComponent(dest);
	//params = "source=" + document.URL + "&destination=" + dest;
	//if ((document.URL.indexOf("giro-d-italia") > -1) || //(document.URL.indexOf("2008/tour-de-france") > -1)) {
			//url = "http://www.grassyknolltv.com/phpscripts/update_click_track_v3.php?"+params;
			//url = "https://www.catspaw.club/clicktrack.cgi?"+params;
			url ="";
			try {
				document.getElementById("iClickTrack").contentWindow.location = url;	
			}
			catch (e) {
				//alert(e);
			}
	//}
	

	 if (xmlHttp && false) { // xmlHttp was succesfully created
			
 		// proceed only if the xmlHttp object isn't busy
		if (xmlHttp.readyState == 4 || xmlHttp.readyState == 0) {
			url = "/phpscripts/update_click_track_v2.php";
			xmlHttp.open("POST", url, true); 
			//xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xmlHttp.setRequestHeader("Content-length", params.length);
			xmlHttp.setRequestHeader("Connection", "close");
			//xmlHttp.onreadystatechange = handleServerResponse; // not needed
			xmlHttp.send(params);
			for (i=1; i < 100000; i++)
				; // delay the unloading of the page so the XMLHttpRequest object has a chance to send the ajax request
  		}	
  	}
  	
  	
  	// todo: else {report/mail an error }  

  	if (jp != -1)
  		return false; // the video played so don't execute the link	
  	else
  		return true;
}

function click_track_explicit(dest) {
	params = "source=" + encodeURIComponent(document.URL) + "&destination=" + encodeURIComponent(dest);
	
	//params = "source=" + document.URL + "&destination=" + dest;
	
	//if ((document.URL.indexOf("giro-d-italia") > -1) || //(document.URL.indexOf("2008/tour-de-france") > -1)) {
			//url = "https://www.catspaw.club/clicktrack.cgi?"+params;
			url ="";
			try {
				document.getElementById("iClickTrack").contentWindow.location = url;	
			}
			catch (e) {
				//alert(e);
			}

	//}
	

	if (xmlHttp && false) { // xmlHttp was succesfully created
			
 		// proceed only if the xmlHttp object isn't busy
		if (xmlHttp.readyState == 4 || xmlHttp.readyState == 0) {
			url = "/phpscripts/update_click_track_v2.php";
			xmlHttp.open("POST", url, true); 
			xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			xmlHttp.setRequestHeader("Content-length", params.length);
			xmlHttp.setRequestHeader("Connection", "close");
			//xmlHttp.onreadystatechange = handleServerResponse; // not needed
			xmlHttp.send(params);
			for (i=1; i < 100000; i++)
				; // delay the unloading of the page so the XMLHttpRequest object has a chance to send the ajax request
  		}	
  	} 	
  	// todo: else {report/mail an error }  
  	//if (des.toString().indexOf("steephill.tv") > -1)
  	//	return true;
  	//else
  		return false;
}



/*
	- it's best to have one handlerServerResponse method for each http send
	- don't use a onreadystatechange callback for anchor objects then leave the page
*/
// executed automatically when a message is received from the server
function handleServerResponse() {
  // move forward only if the transaction has completed
  if (xmlHttp.readyState == 4)  {
    // status of 200 indicates the transaction completed successfully
    if (xmlHttp.status == 200) {
      // extract the XML retrieved from the server
      xmlResponse = xmlHttp.responseXML;
    } 
    // a HTTP status different than 200 signals an error
    else  {
      ;//alert("There was a problem accessing the server: " + xmlHttp.statusText);
    }
  } // if (xmlHttp.readyState == 4)
} // function handleServerResponse()

function stage_races_html(){

	return '<tr bgcolor=\"white\">'+
			'<td><a href=http://www.steephill.tv/2022/UCICompetitions_ROA_2022-Jan-08.pdf xhref=http://www.steephill.tv/2021/Calendar_ROA_3_19_2021.pdf xhref=\"/2021/uci-world-calendar/#date=Current\">2022 UCI World Calendar</a></td>'+
		'</tr>'+
		
	    '<tr bgcolor=\"#e66000\">'+
			'<td><a style=\"color:white\"  href=\"/tour-down-under/\">Tour Down Under \'20</a> <font color="white">|</font> <a style=\"color:white\"  href=\"/2019/tour-down-under/\">\'19</a></td>'+
		'</tr>'+

			
	    '<tr bgcolor=\"#FFFFCC\">'+
			'<td><a style=\"color:#2A5B8B\"  href=\"/vuelta-a-san-juan/\">Vuelta a San Juan \'21</a> <font color="#2A5B8B">|</font> <a style=\"color:#2A5B8B\"  href=\"/2020/vuelta-a-san-juan/\">\'20</a></td>'+
		'</tr>'+
		
				'<tr bgcolor=\"#0079db\">'+
			'<td><a style=\"color:#ffbf0d\" href=\"/etoile-de-besseges/\">Étoile de Bessèges \'21</a></td>'+
		'</tr>'+
		
		
		/*
		   '<tr bgcolor=\"#0D75CC\">'+
			'<td><a style=\"color:#FFCC33\"  href=\"/volta-a-la-comunitat-valenciana/\">Volta a Valenciana \'20</a></td>'+
		'</tr>'+*/
'<tr bgcolor=\"#0D75CC\">'+
			'<td><a style=\"color:#FFCC33\"  href=\"/tour-de-provence/\">Tour de Provence \'21</a></td>'+
		'</tr>'+		
		
'<tr bgcolor=\"#1D2124\">'+
			'<td><a  href=\"/tour-colombia/\"  style=\"color:#FDCB2D\">Tour Colombia \'20</a>  <font color="#FDCB2D">|</font>  <a  href=\"/2019/tour-colombia/\"  style=\"color:#FDCB2D\"> \'19</a> </td>'+
		'</tr>'+		
		
		/*<font color="#FDCB2D">|</font> <a  xhref=\"/2017/colombia-oro-y-paz/\"  style=\"color:#FDCB2D\"> \'17</a>*/
		
		/*	
		
	    '<tr bgcolor=\"#594A2D\">'+
			'<td><a style=\"color:white\"  href=\"/tour-of-qatar/\"><strike>Tour of Qatar</strike> \'16</a> <font color="white">|</font> <a style=\"color:white\"  href=\"/2015/tour-of-qatar/\">\'15</a></td>'+
		'</tr>'+*/
		
		/*
				'<tr bgcolor=\"#00489A\">'+
			'<td><a style=\"color:#74CDF5\"  href=\"/tour-mediterraneen/\">Tour M&eacute;diterran&eacute;en \'14</a></td>'+
		'</tr>'+*/
		
		/*'<tr bgcolor=\"#C4DEF7\">'+
			'<td><a style=\"color:black\"  href=\"/giro-della-provincia-di-reggio-calabria/\">Reggio Calabria \'12</a> <font color="black">|</font> <a style=\"color:black\"  href=\"/2011/giro-della-provincia-di-reggio/\">\'11</a></td>'+
		'</tr>'+*/
			
		
		'<tr bgcolor=\"red">'+
			'<td><a style=\"color:#bbdb88\"  href=\"/tour-of-oman/\">Tour of Oman \'19</a> <font color="#bbdb88">|</font> <a style=\"color:#bbdb88\"  href=\"/2018/tour-of-oman/\">\'18</a></td>'+
		'</tr>'+			
		
	    '<tr bgcolor=\"#016334\">'+
			'<td><a style=\"color:#F6D063\"  href=\"/volta-ao-algarve/\">Volta ao Algarve \'20</a> <font color="#F6D063">|</font> <a style=\"color:#F6D063\"  href=\"/2019/volta-ao-algarve/\">\'19</a></td>'+
		'</tr>'+
		
		'<tr bgcolor=\"#E60000\">'+
			'<td><a style=\"color:#FFECC3\"  href=\"/vuelta-a-andalucia-ruta-ciclista-del-sol/\">Vuelta a Andalucía \'20</a> <font color="#FFECC3">|</font> <a style=\"color:#FFECC3\"  href=\"/2019/vuelta-a-andalucia-ruta-ciclista-del-sol/\">\'19</a></td>'+
		'</tr>'+
		
		'<tr bgcolor=\"#594A2D\">'+
			'<td><a style=\"color:white\"  href=\"/uae-tour/\">UAE Tour \'21</a> <font color="white"> | </font> <a style=\"color:white\"  href=\"/2020/uae-tour/\">\'20</a> </td>'+
		'</tr>' +

		/*'<tr bgcolor=\"#9999FF\">'+
			'<td><a  href=\"/tour-du-haut-var/\"  style=\"color:yellow\">Tour du Haut Var \'15</a></td>'+
		'</tr>'+*/
		
		/*
		'<tr bgcolor=\"#F67F21\">'+
			'<td><a style=\"color:#2A4480\" href=\"/2017/uci-world-calendar/#race=Le%20Tour%20de%20Langkawi\">Tour de Langkawi \'17</a> <font color="#2A4480">|</font> <a style=\"color:#2A4480\" href=\"/tour-de-langkawi/\">\'16</a></tr>'
			
			+*/
		
		
			  
		
		/*'<tr bgcolor=\"#3E61A3\">'+
			'<td style=\"color:white\"><a style=\"color:white\" href=\"/giro-di-sardegna/\">Giro di Sardegna \'11</a> <font color="white">|</font> <a style=\"color:white\"  href=\"/2010/giro-di-sardegna/\">\'10</a></td>'+
		'</tr>'+*/
		
		
		/*'<tr bgcolor=\"#C4B90D\">'+
			'<td><a style=\"color:#A90050\" href=\"/2012/uci-world-calendar/#race=Vuelta%20Ciclista%20a%20Murcia\">Vuelta a Murcia \'12</a> <font color="#A90050">|</font> <a style=\"color:#A90050\" href=\"/vuelta-a-murcia/\">\'11</a></td>'+
		'</tr>'+*/		
		
		'<tr bgcolor=\"#0079db\">'+
			'<td><a style=\"color:#ffbf0d\" href=\"/paris-nice/\">Paris-Nice \'21</a> <font color="#ffbf0d">|</font> <a style=\"color:#ffbf0d\" href=\"/2020/paris-nice/\">\'19</a></tr>'+
			
			
			
		
		'<tr bgcolor=\"#C4C949\">'+
			'<td><a style=\"color:black\" href=\"/tirreno-adriatico/\">Tirreno-Adriatico \'21</a>  <font color="black">|</font> <a style=\"color:black\" href=\"/2020/tirreno-adriatico/\">\'20</a></td>'+
		'</tr>'+	

		
		'<tr bgcolor=\"#ED1C24\">'+
			'<td><a style=\"color:#EAC102\" href=\"/volta-a-catalunya/\">Volta a Catalunya \'21</a> <font color="#EAC102">|</font> <a  href=\"/2019/volta-a-catalunya/\"  style=\"color:#EAC102\">\'19</a></td>'+
		'</tr>'+

		'<tr bgcolor=\"#ffd63b\">'+
			'<td><a  href=\"/coppi-e-bartali/\"  style=\"color:#a85868\">Coppi e Bartali \'18</a> <font color="#a85868">|</font> <a  href=\"/2017/coppi-e-bartali/\"  style=\"color:#a85868\">\'17</a></td>'+
		'</tr>'+
		
			
		/*
		'<tr bgcolor=\"#023D75\">'+
			'<td><a  href=\"/driedaagse-de-panne/\"  style=\"color:white\">Driedaagse De Panne \'17</a></td>'+
		'</tr>'+*/
		
		/*
		'<tr bgcolor=\"#000000\">'+
			'<td><a style=\"color:#d7d7d7\"  href=\"/circuit-cycliste-sarthe/\">Circuit Cycliste Sarthe \'10</a></td>'+
		'</tr>'+ */	
		
		'</tr>'+ 
		'<tr bgcolor=\"#349400\">'+
			'<td><a  href=\"/vuelta-al-pais-vasco/\" style=\"color:#FFE600\" >Itzulia Basque Country \'21</a></td> '+
		'</tr>'+		
		
		//'<tr bgcolor=\"#002675\">'+
		//	'<td><a style=\"color:#3ec200\" href=\"/2008/tour-de-georgia/\">Tour de Georgia \'08</a> <font color="#3ec200">|</font> <a style=\"color:#3ec200\" href=\"/2007/tour-de-georgia/\">\'07</a></td>'+
		//'</tr>'+
		
		/*'<tr bgcolor=\"#7D0925\">'+
			'<td><a style=\"color:white\" href=\"/vuelta-castilla-y-leon/\">Vuelta a Castilla y León \'12</a></td>'+
		'</tr>'+*/
		

		

		'<tr bgcolor=\"#0094AE\">'+
			'<td><a style=\"color:white\" href=\"/tour-of-turkey\">Tour of Turkey \'19</a></a></td>'+
		'</tr>'		+
		
		'<tr bgcolor=\"#004ecc\">'+
			'<td><a style=\"color:#9dd05b\" href=\"/tour-of-the-alps/\">Tour of the Alps \'21</a> <font color="#9dd05b">|</font> <a style=\"color:#9dd05b\" href=\"/2019/tour-of-the-alps/\">\'18</a></td>'+
		'</tr>'+		
		
				'<tr bgcolor=\"black\">'+
			'<td><a style=\"color:#F7E030\" href=\"/tour-de-romandie/">Tour de Romandie \'21</a>  <font color="#F7E030">|</font>  <a style=\"color:#F7E030\" href=\"/2019/tour-de-romandie/">\'19</a></td>'+
		'</tr>'+
		
				'<tr bgcolor=\"#19D1FF">'+
			'<td><a style=\"color:#FFFF00\" href=\"/tour-de-yorkshire/">Tour de Yorkshire \'19</a>  <font color="#FFFF00">|</font>  <a style=\"color:#FFFF00\" href=\"/2018/tour-de-yorkshire/">\'18</a></td>'+
		'</tr>'+		
		
		'<tr bgcolor=\"#F7B5CB\">'+
			'<td><a href=\"/giro-d-italia/\">Giro d\'Italia \'22</a> <font color="black">|</font> <a href=\"/2021/giro-d-italia/\">\'21</a> <font color="black">|</font> <a href=\"/2020/giro-d-italia/\">\'20</a></td>'+
		'</tr>'+
		/*
				'<tr bgcolor=\"#A9B9DB\">'+
			'<td><a style=\"color:#E41936\" href=\"/redlands-classic/\">Redlands Bicycle Classic \'16</a></td>'+
		'</tr>'+*/

		'<tr bgcolor=\"#CC9933\">'+
			'<td><a href=\"/tour-of-california/\">Tour of California \'19</a> | <a href=\"/2018/tour-of-california/\">\'18</a></td>'+
		'</tr>'+
		
	
		/*
		'<tr bgcolor=\"#4B0082\">'+
			'<td><a style=\"color:white\" href=\"/hammerseries/\">Hammer Series \'17</a></td>'+
		'</tr>'+*/
		
		'<tr bgcolor=\"#000000\">'+
			'<td><a style=\"color:white\"  href=\"/criterium-du-dauphine-libere/\">Critérium du Dauphin&eacute; \'21</a>  <!--font color="white">|</font> <a style=\"color:white\" href=\"/2011/criterium-du-dauphine-libere/"> \'11</a--></td>'+
		'</tr>'+	
		
		'<tr bgcolor=\"#cc002b\">'+
			'<td><a style=\"color:white\"  href=\"/tour-de-suisse/\">Tour de Suisse \'21</a> <font color="white">|</font> <a style=\"color:white\" href=\"/2019/tour-de-suisse/\">\'19</a></td>'+
		'</tr>'+	
		
		'<tr bgcolor=\"#A4D4B0\">'+
			'<td style=\"color:black\"><a  style=\"color:black\" href=\"/2018/uci-world-calendar/#race=Tour%20de%20Beauce\">Tour de Beauce \'18</a>&nbsp;<font color="black">|</font>&nbsp;<a style=\"color:black\" href=\"/2017/uci-world-calendar/#race=Tour%20de%20Beauce\">\'17</a></td>'+
		'</tr>'+
		
		'<tr bgcolor=\"#d6182a\">'+
			'<td><a style=\"color:#FFCC33\"  href=\"/route-d-occitanie/\">Route d’Occitanie \'21</a>&nbsp;<font color="#FFCC33">|</font>&nbsp;<a style=\"color:#FFCC33\" href=\"/2019/route-d-occitanie/\">\'19</a></td>'+
		'</tr>'+	
				
		
		'<tr bgcolor=\"#FFD816\">'+
			'<td style=\"color:black\"><a style=\"color:black\" href=\"/tour-de-france/\">Tour de France \'22</a>&nbsp;|&nbsp;<a style=\"color:black\" href=\"/2021/tour-de-france/\">\'21</a></td>'+
		'</tr>'+
		
		'<tr bgcolor=\"#FDEE61\">'+
			'<td style=\"color:black\"><a style=\"color:#BE0027\" href=\"/tour-de-pologne/\">Tour de Pologne \'21</a>&nbsp;<font color="#BE0027">|</font>&nbsp;<a style=\"color:#BE0027\" href=\"/2019/tour-de-pologne/\">\'19</a></td>'+
		'</tr>'+
		
				'<tr bgcolor=\"#853241\">'+
			'<td style=\"color:#a33100\"><a style=\"color:#EDD100\" href=\"/2019/uci-world-calendar/#race=The%20Larry%20H.Miller%20Tour%20of%20Utah/2018/uci-world-calendar/#race=The%20Larry%20H.Miller%20Tour%20of%20Utah\">Tour of Utah \'19</a>&nbsp;<font color="#EDD100">|</font>&nbsp;<a style=\"color:#EDD100\" href=\"/2018/uci-world-calendar/#race=The%20Larry%20H.Miller%20Tour%20of%20Utah\">\'18</a></td>'+
		'</tr>' 
		
		+
		
					    '<tr bgcolor=\"#9AD168\">'+
			'<td><a style=\"color:black\"  href=\"/binckbank-tour/\"> BinckBank Tour \'20</a> <font color="black">|</font> <a style=\"color:black\"  href=\"/2019/binckbank-tour/\">\'19</a></td>'+
		'</tr>'
		
		+
		
			'<tr bgcolor=\"#A9B9DB\">'+
		
			'<td><a style=\"color:#E41936\" href=\"/colorado-classic/\">Colorado Classic \'17</a> <font color="black">|</font> <a style=\"color:#E41936\" href=\"/usa-pro-cycling-challenge/\">\'15</a></td>'+
		'</tr>'	
		+
		
		
		'<tr bgcolor=\"#004ecc\">'+
			'<td style=\"color:#004ecc\"><a style=\"color:#ffd700\" href=\"/2019/uci-world-calendar/#race=Arctic%20Race%20of%20Norway\">Arctic Race of Norway \'19</a></td>'+
		'</tr>'+		
		
		
		//'<tr bgcolor=\"#009A63\">'+
		//	'<td><a style=\"color:#FF823D\" href=\"/tour-of-ireland/\">Tour of Ireland \'09</a> </td>'+
		//'</tr>'+		

		
		'<tr bgcolor=\"#d6182a\">'+
			'<td><a style=\"color:#FFCC33\" href=\"/vuelta-a-espana/\">Vuelta a Espa&ntilde;a \'21</a> <font color="#FFCC33">|</font> <a style=\"color:#FFCC33\" href=\"/2020/vuelta-a-espana/\">\'20</a></td>'+
		'</tr>'+
		
		/*
		'<tr bgcolor=\"#023D75\">'+
			'<td><a  href=\"/dubai-tour/\"  style=\"color:white\">Dubai Tour \'18</a> <font color="white">|</font> <a  href=\"/2017/dubai-tour/\"  style=\"color:white\"> \'17</a></td>'+
		'</tr>'+	
		
		  '<tr bgcolor=\"#594A2D\">'+
			'<td><a style=\"color:white\"  href=\"/abu-dhabi-tour/\">Abu Dhabi Tour \'18</a> | </font> <a style=\"color:white\"  href=\"/2017/abu-dhabi-tour/\">\'17</a> </td>'+
		'</tr>'*/
			
		
		'<tr bgcolor=\"#8DCEA0\">'+
			'<td><a style=\"color:#A22020\" href=\"/tour-of-alberta/\">Tour of Alberta \'17</a> | <a style=\"color:#A22020\" href=\"/2016/tour-of-alberta/\">\'16</a></td>'+
		'</tr>'+
		
		'<tr bgcolor=\"#023D75\">'+
			'<td><a  href=\"/tour-of-britain/\"  style=\"color:white\">Tour of Britain \'17</a>&nbsp;<font color="white">|</font>&nbsp;<a style=\"color:white" href=\"/2016/tour-of-britain/\">\'16</a></td>'+
		'</tr>'  ;
		
		/*'<tr bgcolor=\"#FE000A\">'+
			'<td><a style=\"color:#FFF577\" href=\"/tour-of-beijing/\">Tour of Beijing \'14</a> <font style=\"color:#FFF577\">|</font> <a style=\"color:#FFF577\" href=\"/2013/tour-of-beijing/\">\'13</a></td>'+
		'</tr>';*/
}

/*		'<tr bgcolor=\"#9AC9B3\">'+
			'<td><a  href=\"/criterium-international/\"  style=\"color:red\">Critérium International \'16</a></td>'+
		'</tr>'+
*/


function major_race_coverage(align, more_styles) {
	var curdate = new Date();
	var day = curdate.getDate();
	var month = months[curdate.getMonth()].substring(0,3);
	// \r<font color=red>Live Today ' + month + ' ' + day + '</font></td>'+
	//\r<font color=red>Starts This Sunday</font> 
	//\r<font color=red>Live Today ' + month + ' ' + day + '</font>

	if (more_styles) {
		more_styles = ';'+more_styles;
	}
	else {
		more_styles = '';
	}
	document.write('<table bgcolor=\"#dcdcdc\"  align=\"' + align + '\" width=\"200\" style=\"font-family:verdana,san-serif;font-size:12px;font-weight:bold;text-align:center;margin-bottom:5px;border:2px gray solid;line-height:1.5em;' + more_styles + '\">');  
document.write(stage_races_html());
document.write('</table>');
	// <font color=\"black\">Now On</font>
	/*
				'<tr bgcolor=\"#5ec1f7\">'+
			'<td><a href=\"/2007/usa-cycling-pro-tour/\">USA Pro Tour Calendar \'08</a></td>'+
		'</tr>'+
		
		
		'<tr bgcolor=\"#CCCCCC\">'+
			'<td><a href=\"/deutschland-tour-of-germany/\">Deutschland Tour \'08</a> | <a href=\"/deutschland-tour-of-germany/#2007\">\'07</a></td>'+
		'</tr>'+	
		
		'<tr bgcolor=\"#00395c\">'+
			'<td style=\"color:#ffa64f\"><a  style=\"color:#ffa64f\" href=\"/tour-of-missouri/\">Tour of Missouri \'09</a> | <a style=\"color:#ffa64f\" href=\"/tour-of-missouri/#2008\">\'08</a></td>'+
		'</tr>'+
		
		<br/><font color=white>Live Today ' + month + ' ' + day + '</font>
		*/
}

function classic_races_html() {
	return 	'<tr bgcolor=\"white\">'+
			'<td><a href=http://www.steephill.tv/2022/UCICompetitions_ROA_2022-Jan-08.pdf xhref=http://www.steephill.tv/2021/Calendar_ROA_3_19_2021.pdf xhref=\"/2021/uci-world-calendar/#date=Current\">2022 UCI World Calendar</a></td>'+
		'</tr>'+
	'<tr>'+
			'<td>Cycling Classics 2022:<br/></td>'+
	'</tr>'+
	
	'<tr>'+	
		'<td><a href=/classics/cadel-evans-great-ocean-road-race/ >Cadel Evans RR</a> ---</td>'+
	'</tr>'+
	
		'<tr>'+		
			'<td><a  href=\"/classics/omloop-het-nieuwsblad/\">Omloop Het Nieuw.</a> Feb 26</td>'+
	'</tr>'+
	

	/*		
	'<tr>'+
			'<td><a  href=\"/classics/trofeo-laigueglia/\">Trofeo-Laigueglia</a> Feb 16</td>'+'</tr>'+ */
			
	'<tr>'+
			'<td><a  href=\"/classics/kuurne-brussels-kuurne/\">Kuurne-Brussels-K</a> Feb 27</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/le-samyn/\">Le Samyn</a> Mar 03</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/strade-bianche/\">Strade Bianche</a> Mar 5</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/milan-san-remo/\">Milan-San Remo</a> Mar 19</td>'+
	'</tr>'+
	
		'<tr>'+
			'<td><a  href=\"/classics/e3-harelbeke/">E3 Saxo Bank</a> Mar 25</td>'+
	'</tr>'+
	
		'<tr>'+
			'<td><a  href=\"/classics/gent-wevelgem/\">Gent-Wevelgem</a> Mar 27</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/dwars-door-vlaanderen/">Dwars d Vlaanderen</a> Mar 30</td>'+
	'</tr>'+
	
	
	'<tr>'+
			'<td><a  href=\"/classics/tour-of-flanders/\">Tour of Flanders</a> Apr 03</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/scheldeprijs/\">Scheldeprijs</a> Apr 06</td>'+
	'</tr>'+
	
		'<tr>'+
			'<td><a  href=\"/classics/amstel-gold-race/\">Amstel Gold</a> Apr 10</td>'+
	'</tr>'+
	
		'<tr>'+
			'<td><a  href=\"/classics/brabantse-pijl/\">De Brabantse Pijl</a> Apr 13</td>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/paris-roubaix/\">Paris-Roubaix</a> Apr 17</td>'+
	'</tr>'+
	

	'</tr>'+
	

	
	'<tr>'+
			'<td><a  href=\"/classics/fleche-wallonne/\">Flèche Wallonne</a> Apr 20</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/liege-bastogne-liege/\">Liège-Bastogne-L</a> Apr 24</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/san-sebastian/\">San Sebastian</a> Jul 30</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/gp-ouest-france/\">Bretagne Classic</a> Aug 28</td>'+
	'</tr>'+	

	'<tr>'+
			'<td><a  href=\"/classics/grand-prix-cycliste-de-quebec/\">GP Cycliste Québec</a> Sep 09</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/grand-prix-cycliste-de-montreal/">GP Cycliste Montreal</a> Sep 11</td>'+
	'</tr>'+
		
	'<tr>'+
			'<td><a  href=\"/road-cycling-world-championships/\">UCI Worlds</a> Sep-18-25</td></tr>' +
	
	'<tr>'+
	
			'<td><a  href=\"/classics/giro-dell-emilia/\">Giro dell\'Emilia</a> Oct 01</td>'+
	'</tr>'+
	
	'<tr>'+
	
			'<td><a  href=\"/classics/milano-torino/\">Milano-Torino</a> ???</td>'+
	'</tr>'+
	
	'<tr>'+
			'<td><a  href=\"/classics/giro-di-lombardia/\">Il Lombardia</a> Oct 08</td>'+
	'</tr>'+

	
	
			'<td><a  href=\"/classics/paris-tours/\">Paris-Tours</a> Oct 09</td>'+
	'</tr>'+

	'</tr>'
	+
	'</tr>';
}

function cycling_classics_coverage(align, more_styles) {
	document.write('<table bgcolor=\"#d4c581\" align=\"' + align + '\" width=\"200\" style=\"font-family:verdana,san-serif;font-size:12px;font-weight:bold;text-align:center;margin-bottom:5px;border:2px gray solid;line-height:1.5em;' + more_styles + '\">');  
	document.write(classic_races_html());

	document.write('</table>');
}

function stage_and_classics_coverage(align, more_styles){
	document.write('<table align=\"' + align + '\" width=\"200\"><tr><td>'); 
	major_race_coverage(align, more_styles);
	cycling_classics_coverage(align, more_styles);
	document.write('</td></tr></table>');
}

function permalink(link) {
	document.write('<a href="#" onclick="prompt(\'Here is a link to the current section of this web page:\',\'' + getAbsoluteLink(link) + '\');return false;"><img src="/img/permalink.gif" width="93" height="16" border="0" align="center"/></a>');		
}

function permalink2(link) {
	document.write('<small><a href="#" onclick="prompt(\'Here is a link to the current section of this web page:\',\'' +  getAbsoluteLink(encodeURI(link)) + '\');return false;">share this photo</a></small>');		
}

function getAbsoluteLink(link) {
	if (link.charAt(0) == '#') {
		var url = document.URL;
		if (url.indexOf("#") > 0)
			url = document.URL.substring(0, (document.URL.indexOf("#")));
		link = url + link;
	}
	return link;
}



function NewWindow(mypage, title, w, h, scroll) {
        var win = OpenWindow(mypage, title, w, h, scroll);
        win.focus();
}

function OpenWindow(mypage, title, w, h, scroll) {
        var winl = (screen.availWidth - w) / 2;
        var wint = (screen.availHeight - h) / 2;
        winprops = 'height='+h+',width='+w+',top='+wint+',left='+winl+',scrollbars='+scroll+',resizable=no';
        return window.open(mypage, title, winprops);
}

function PlayYouTube(title, id) {
		var win = OpenWindow('',title,440,368,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object width="425" height=\"350\"><param name=\"movie\" value=\"http://www.youtube.com\/v\/'+ id + '\"></param><param name="wmode" value="transparent"></param><embed src="http://www.youtube.com/v/'+ id + '" type="application\/x-shockwave-flash" wmode="transparent" width="425" height="350"></embed><\/object></body></html>');
win.window.focus();
return false;
}


function PlayYouTubeVideo(title,id) {
	var absolute  = 'http://www.grassyknolltv.com/movies/2008/youtube/'+id+'.flv';
	//prompt('', absolute);
	PlayFlvVideo(title,absolute,465,350);
}


function PlayFlvVideo(title, url, width, height) {
	var win = OpenWindow('',title,17+width,17+height,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=7,0,19,0" height="'+ height + '" width="'+width+'"> <br /> <param name="salign" value="lt">  <param name="quality" value="high">  <param name="scale" value="noscale">  <param name="wmode" value="transparent">  <param name="movie" value="http://geekfile.googlepages.com/flvplay.swf">  <param name="FlashVars" value="&streamName='+url+'&amp;skinName=/flash/flvskin&autoPlay=true&amp;autoRewind=true">  <embed flashvars="&streamName='+url+'&amp;autoPlay=true&autoRewind=true&amp;skinName=/flash/flvskin" quality="high" scale="noscale" salign="LT" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" src="/flash/flvplay.swf" wmode="transparent" height="'+ height + '" width="'+width+'"><\/embed><\/object></body></html>');
win.window.focus();
return false;
}

function PlayGoogleVideo(title, id) {
	var win = OpenWindow('',title,415,340,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><embed style="width:400px; height:326px;" id="VideoPlayback"  flashvars="" type="application/x-shockwave-flash" src="http://video.google.com/googleplayer.swf?docId=' + id + '&hl=en"> </embed></body></html>');
win.window.focus();
return false;
}

function PlayVeloNewsVideo(title, articleID, fileTypeID, adID, adObject) {
	var win = OpenWindow('',title,525,425,'no');
	adID=0;
win.document.write('<html><head><title>'+title+'</title></head><body><embed src=\'http://cdn.dayport.com/contagionimg/img/flashEmbedPlayer.swf\' flashVars=\'articleID='+ articleID + '&fileTypeID=' + fileTypeID + '&videoAdConDefID=' + adID + '&videoAdObjectID=' + adObject + '\' name=\'bcPlayerExt\' wmode=\'transparent\' width=\'509\' height=\'409\' allowScriptAccess=\'always\' type=\'application/x-shockwave-flash\' swLiveConnect=\'true\' pluginspage=\'http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash\'></embed></body></html>');
win.window.focus();
return false;
}

function PlayStreetFilm(title, file, image) {
	var win = OpenWindow('',title,465,385,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object type="application/x-shockwave-flash" height="369" width="450" data="http://www.streetfilms.org/flvplayer.swf"><param name="movie" value="http://www.streetfilms.org/flvplayer.swf" /><param name="bgcolor" value="#000000" /><param name="flashvars" value="displayheight=349&file=http://www.streetfilms.org/wp-content/uploads/' + file + '&image=http://www.streetfilms.org/wp-content/uploads/' + image + '&overstretch=true&showfsbutton=false&showdigits=true&backcolor=0x22313c&frontcolor=0xbfced8&lightcolor=0xc1d72e&volume=90&autostart=true&logo=http://www.streetfilms.org/wp-content/themes/streetfilms/images/streetfilms_watermark.png&link=http://www.streetfilms.org&title=Physically Separated Bike Lanes OFFSITE&id=168&callback=http://www.streetfilms.org/wp-content/plugins/streetfilms/statistics.php" /></object></body></html>');
win.window.focus();
return false;
}


function PlayBreakVideo(title, id) {
	var win = OpenWindow('',title,480,412,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object width="464" height="392"><param name="movie" value="http://embed.break.com/' + id +'"></param><embed src="http://embed.break.com/' + id + '" type="application/x-shockwave-flash" width="464" height="392"></embed></object></body></html>');
win.window.focus();
return false;
}

function PlayLiveVideo(title, id) {
	var win = OpenWindow('',title,460,369,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><embed src="http://www.livevideo.com/flvplayer/embed/'+ id +'" type="application/x-shockwave-flash" quality="high" WIDTH="445" HEIGHT="369" wmode="transparent"></embed></body></html>');
win.window.focus();
return false;
}



function PlayYahooVideo(title, id) {
	var win = OpenWindow('',title,445,370,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><embed src="http://us.i1.yimg.com/cosmos.bcst.yahoo.com/player/media/swf/FLVVideoSolo.swf" flashvars="id=' + id + '&imTitle=' + title +'" type="application/x-shockwave-flash" width="425" height="350"></embed></body></html>');
win.window.focus();
return false;
}

function PlayBrightroomVideo(title, id) {
	var win = OpenWindow('',title,502,428,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><embed src="http://services.brightcove.com/services/viewer/federated_f8/1137883380" bgcolor="#FFFFFF" flashVars="videoId=' + id + '&playerId=1137883380&viewerSecureGatewayURL=https://services.brightcove.com/services/amfgateway&servicesURL=http://services.brightcove.com/services&cdnURL=http://admin.brightcove.com&domain=embed&autoStart=false&" base="http://admin.brightcove.com" name="flashObj" width="486" height="412" seamlesstabbing="false" type="application/x-shockwave-flash" swLiveConnect="true" pluginspage="http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash"></embed></body></html>');
win.window.focus();
return false;
}

function PlayBlipTvVideo(title, url, brandname, brandlink) {
	var win = OpenWindow('',title,495,415,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object type="application/x-shockwave-flash" data="http://blip.tv/scripts/flash/showplayer.swf?enablejs=true&file=' + url + '&autostart=false&brandname=' + brandname + '&brandlink=' + brandlink + '" width="480" height="392" allowfullscreen="true" id="showplayer"><param name="movie" value="http://blip.tv/scripts/flash/showplayer.swf?enablejs=true&file=' + url + '&autostart=false&brandname=' + brandname + '&brandlink=' + brandlink + '" /><param name="quality" value="best" /></object></body></html>');
win.window.focus();
return false;
}

function PlayQTVideo(title, url, width, height) {
		var h2 = parseInt(height)+31;
		var h3 = parseInt(height)+16;
		var w2 = parseInt(width)+16;
		var win = OpenWindow('',title,w2,h2,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" codebase="http://www.apple.com/qtactivex/qtplugin.cab" height="'+h3+'" width="'+width+'"><param name="src" value="'+url+'"><param name="autoplay" value="true"><param name="controller" value="true"><embed pluginspage="http://www.apple.com/quicktime/download/" cache="false" src="'+url+'" type="video/quicktime" height="'+h3+'" width="'+width+'"> </object></body></html>');
win.window.focus();
return false;
}

function PlayRealVideo(title, url, width, height) {
		var win = OpenWindow('',title,15+width,70+height,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object id="myMovie" classid="CLSID:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA" height="' + height + '" width="' + width + '"> <param name="controls" value="ImageWindow"> <param name="console" value="video"> <param name="center" value="true"> <param name="type" value="audio/x-pn-realaudio-plugin"> <embed name="myMovie" TYPE="audio/x-pn-realaudio-plugin" src="' + url + '" height="' + height + '" width="' + width + '" nojava="true" controls="ImageWindow" console="video" center="true" pluginspage="http://www.real.com/"></embed> </object> <br clear="all"/> <object id="myMovie" classid="CLSID:CFCDAA03-8BE4-11cf-B84B-0020AFBBCCFA" height="50" width="' + width + '"> <param name="controls" value="all"> <param name="console" value="video"> <param name="center" value="true"> <param name="type" value="audio/x-pn-realaudio-plugin"> <embed name="myMovie" TYPE="audio/x-pn-realaudio-plugin" src="' + url + '" height="50" width="' + width + '" nojava="true" controls="all" console="video" center="true" pluginspage="http://www.real.com/"></embed> </object></body></html>');
win.window.focus();
return false;
}

function PlayDailyMotion(title, id, width, height) {
		var h2 = parseInt(height)+15;
		var w2 = parseInt(width)+15;
        var winl = (screen.width - w2) / 2;
        var wint = (screen.height - h2) / 2;
        winprops = 'height='+h2+',width='+w2+',top='+wint+',left='+winl+',scrollbars=no,resizable=no';
        var win = window.open("",title,winprops);
win.document.write('<html><head><title>'+title+'</title></head><body><object width="520" height="411"><param name="movie" value="http://www.dailymotion.com/swf/'+id+'&v3=1&related=1"></param><param name="allowFullScreen" value="true"></param><param name="allowScriptAccess" value="always"></param><embed src="http://www.dailymotion.com/swf/'+id+'&v3=1&related=1" type="application/x-shockwave-flash" width="520" height="411" allowFullScreen="true" allowScriptAccess="always"></embed></object></body></html>');
win.window.focus();
return false;
}

function PlayCycleTo(title, id) {
	var win = OpenWindow('',title,501,427,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><embed src="http://www.brightcove.tv/playerswf" bgcolor="#FFFFFF" flashVars="initVideoId=' + id + '&servicesURL=http://www.brightcove.tv&viewerSecureGatewayURL=https://www.brightcove.tv&cdnURL=http://admin.brightcove.com&autoStart=false" base="http://admin.brightcove.com" name="bcPlayer" width="486" height="412" allowFullScreen="true" allowScriptAccess="always" seamlesstabbing="false" type="application/x-shockwave-flash" swLiveConnect="true" pluginspage="http://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash"></embed></body></html>');
win.window.focus();
return false;
}


function PlaySavannahNow(title, id) {
	return PlayCycleTo(title,id);
}



function PlayCosmos(title, id, day, month, year) {
	url = 'http://cosmos.bcst.yahoo.com/up/player/popup/index.php?cl='+id;
	NewWindow(url,title,430,426,'no');
	return false;
	/*
        var winl = (screen.width - 419) / 2;
        var wint = (screen.height - 426) / 2;
        winprops = 'height='+426+',width='+419+',top='+wint+',left='+winl+',scrollbars=no,resizable=no';
        win = window.open("",title,winprops);
        
        
win.document.write('<html><head><META HTTP-EQUIV="Refresh" CONTENT="0; URL="http://cosmos.bcst.yahoo.com/up/player/popup/index.php?cl='+id+'"><title>' +title+'</title></head><body></body></html>');       
       
        
win.document.write('<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0"width="320"height="270"id="yfop"><param name="allowScriptAccess" value="always" /><param name="movie" value="http://cosmos.bcst.yahoo.com/up/fop/embedflv/swf/fop.swf" /><param name="flashvars" value="id='+ id +'" /><embed	src="http://cosmos.bcst.yahoo.com/up/fop/embedflv/swf/fop.swf" width="320" height="270" name="yfop" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" flashvars="id='+ id +'" /></object>');
win.window.focus();*/
}

function PlayCosmos2(obj, title) {
	//alert("test");
	click_track_explicit(obj.href);
	NewWindow(obj.href, title, 430, 426, 'no'); 
	return false;
}


function PlayVersus(title,id,ver) {
	var win = OpenWindow('/players/versus/?title='+title+'&id='+id+'&ver='+ver,title,677,385,'no');
	/*
	win.document.write('<html><head><title>'+title+'</title></head><body><div style="margin-top:-30px"><script language="JavaScript" type="text/javascript" src="http://versus.img.cdn.dayport.com/dayportcore/dpm/DayPortPlayers.js"></script><script language="JavaScript" type="text/javascript">DayPortPlayer.newPlayer({articleID:"69476",playerInstanceID:"85A2AF24-3DB6-B851-C54B-2B44EF9116AA",domain:"oln.dayport.com"});</script></div>');*/
	win.window.focus();
	return false;
/*
	win.document.write('<html><head><title>'+title+'</title></head><body><div style="margin-top:-30px"><script language="JavaScript" type="text/javascript" src="http://versus.img.cdn.dayport.com/dayportcore/dpm/DayPortPlayers.js"></script><script language="JavaScript" type="text/javascript">DayPortPlayer.newPlayer({articleID:"' + id + '",playerInstanceID:"85A2AF24-3DB6-B851-C54B-2B44EF9116AA",domain:"oln.dayport.com"});</script></div></body></html>');
	win.window.focus();*/
}

function PlayInnerTube(title,id) {
	var win = OpenWindow('',title,436,379,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="420" height="365" id="Video'+ id +'"><param name="movie" value="http://theinnertube.cycling.tv/kickapps/flash/premium_drop_v3.swf?b=1&amp;widgetHost=theinnertube.cycling.tv&amp;mediaType=VIDEO&amp;mediaId=189340&amp;as=2501" type="application/x-shockwave-flash"></param><param name="allowScriptAccess" value="always"></param><embed src="http://theinnertube.cycling.tv/kickapps/flash/premium_drop_v3.swf?b=1&amp;widgetHost=theinnertube.cycling.tv&amp;mediaType=VIDEO&amp;mediaId=189340&amp;as=2501" quality="best" width="420" height="365" allowfullscreen="true" allowScriptAccess="always"></embed></object></body></html>');
win.window.focus();
return false;
}

function PlayAOL(title,player_id,pmms) {
	var win = OpenWindow('',title,335,320,'no');
win.document.write('<html><head><title>'+title+'</title></head><body><OBJECT id="player' + player_id +'" codeBase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" height="308" width="320" padding="0" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" VIEWASTEXT><PARAM NAME="FlashVars" VALUE="autoplay=false&assetId=video:asset:pmms:' + pmms + '&playerId=player' + player_id +'"><PARAM NAME="Movie" VALUE="http://o.aolcdn.com/mediaplayer/players/fpm/fpm.swf"><PARAM NAME="src" VALUE="http://o.aolcdn.com/mediaplayer/players/fpm/fpm.swf"><PARAM NAME="WMode" VALUE="transparent"><PARAM NAME="AllowScriptAccess" VALUE="always"><PARAM NAME="AllowNetworking" VALUE="all"><embed src="http://o.aolcdn.com/mediaplayer/players/fpm/fpm.swf" FlashVars="autoplay=false&assetId=video:asset:pmms:' + pmms + '&playerId=player' + player_id +'" quality="high" width="320" height="308" name="player' + player_id +'"  allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer"  wmode="transparent"></embed></OBJECT></body></html>');
win.window.focus();
return false;
}






// gmt_offset is how many hours the specified time is ahead of GMT or UTC example Germany is 2 hours ahead of GMT; PST minus 7 since it's 7 hours behind GMT
function activate_link(title, href, gmt_offset,  year, month, day, hours, minutes) {
	var finish_date = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0));
	finish_date.setHours(finish_date.getHours() - gmt_offset);
	var current_date = new Date();
	
	var attribute_name = "name";
	if (current_date >= finish_date) {
		attribute_name = "href";
	}
	document.write('<a ' + attribute_name + '="' + href + '">' + title + '<\/a>');
	//document.write(" current: " + current_date.toUTCString() + "; finish: "+ finish_date.toUTCString());
}

// date must be in the form of "March 9, 2007" and  "12:10 pm GMT"
// display_type: full = 0;  March 9, 12:10 pm; time = 1 12:10 
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function gmt_start_to_local_time(display_type, year, month, day, hours, minutes, seconds) {
	
	var d =  new Date(Date.UTC(year, month, day, hours, minutes, seconds, 0));
	var lts = d.toLocaleTimeString();
	if (display_type == 0) { // display full date
		document.write(d.toUTCString());
		document.write(' ('+ lts.substring(0, lts.length) + ' your time)');	
	}
	else if (display_type == 1) { // display full date
		
		document.write(d.format("longTime"));
	}
	
		//document.write(months[d.getUTCMonth()] + ' ' + d.getUTCDay() + ', ');
	//document.write(d.getUTCHours() + ':' +  d.getUTCMinutes());
	
}

/*
	Date Format 1.1
	(c) 2007 Steven Levithan <stevenlevithan.com>
	MIT license
	With code by Scott Trenda (Z and o flags, and enhanced brevity)
*/

/*** dateFormat
	Accepts a date, a mask, or a date and a mask.
	Returns a formatted version of the given date.
	The date defaults to the current date/time.
	The mask defaults ``"ddd mmm d yyyy HH:MM:ss"``.
*/
var dateFormat = function () {
	var	token        = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloZ]|"[^"]*"|'[^']*'/g,
		timezone     = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
		timezoneClip = /[^-+\dA-Z]/g,
		pad = function (value, length) {
			value = String(value);
			length = parseInt(length) || 2;
			while (value.length < length)
				value = "0" + value;
			return value;
		};

	// Regexes and supporting functions are cached through closure
	return function (date, mask) {
		// Treat the first argument as a mask if it doesn't contain any numbers
		if (
			arguments.length == 1 &&
			(typeof date == "string" || date instanceof String) &&
			!/\d/.test(date)
		) {
			mask = date;
			date = undefined;
		}

		date = date ? new Date(date) : new Date();
		if (isNaN(date))
			throw "invalid date";

		var dF = dateFormat;
		mask   = String(dF.masks[mask] || mask || dF.masks["default"]);

		var	d = date.getDate(),
			D = date.getDay(),
			m = date.getMonth(),
			y = date.getFullYear(),
			H = date.getHours(),
			M = date.getMinutes(),
			s = date.getSeconds(),
			L = date.getMilliseconds(),
			o = date.getTimezoneOffset(),
			flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4)
			};

		return mask.replace(token, function ($0) {
			return ($0 in flags) ? flags[$0] : $0.slice(1, $0.length - 1);
		});
	};
}();

// Some common format strings
dateFormat.masks = {
	"default":       "ddd mmm d yyyy HH:MM:ss",
	shortDate:       "m/d/yy",
	mediumDate:      "mmm d, yyyy",
	longDate:        "mmmm d, yyyy",
	fullDate:        "dddd, mmmm d, yyyy",
	shortTime:       "h:MM TT",
	mediumTime:      "h:MM:ss TT",
	longTime:        "h:MM:ss TT Z",
	isoDate:         "yyyy-mm-dd",
	isoTime:         "HH:MM:ss",
	isoDateTime:     "yyyy-mm-dd'T'HH:MM:ss",
	isoFullDateTime: "yyyy-mm-dd'T'HH:MM:ss.lo"
};

// Internationalization strings
dateFormat.i18n = {
	dayNames: [
		"Sun", "Mon", "Tue", "Wed", "Thr", "Fri", "Sat",
		"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
	],
	monthNames: [
		"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
		"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
	]
};

// For convenience...
Date.prototype.format = function (mask) {
	return dateFormat(this, mask);
}

function caption_image(a) {
	if (a['align'] == undefined) a['align'] = 'left';
	if (a['align'] == 'left')
		margin = 'right';
	else
		margin = 'left';
	document.write('<table width="'+a['width']+'" align="'+a['align']+'" style="margin-'+margin+':10px"><tr><td><img src="'+a['image_url']+'" width="'+a['width']+'" border="1"/><br clear="'+a['align']+'"/><div style="padding:2px 2px 2px 2px;font:bold 11px arial;small;text-align:center;background-color:#B7B7B7">'+a['caption']+' (photo:' + a['credit'].link(a['source_url']) + ')</div></td></tr></table>');
}

function get_url_parameter(name) {
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null )
    return "";
  else
    return results[1];
}

function loadScript(url) {
   var e = document.createElement("script");
   e.src = url;
   e.type="text/javascript";
   document.getElementsByTagName("head")[0].appendChild(e); 
}
// ------------- load html from server into specified container then hide activating link
function ajaxpage(url, containerid){
	var page_request = false;
	if (window.XMLHttpRequest) // if Mozilla, Safari etc
		var page_request = new XMLHttpRequest();
	else if (window.ActiveXObject){ // if IE
		try {
				page_request = new ActiveXObject("Msxml2.XMLHTTP");
			} 
		catch (e){
				try{
					page_request = new ActiveXObject("Microsoft.XMLHTTP");
					}
				catch (e){}
		}
	}
	else
		return false;
	page_request.onreadystatechange=function(){
		loadpage(page_request, containerid);
	}
	page_request.open('GET', url, true);
	page_request.send(null);
	var hideID = ""+containerid+"_link";
	document.getElementById(hideID).style.display='none';
}

function loadpage(page_request, containerid){
	if (page_request.readyState == 4 && (page_request.status==200 || window.location.href.indexOf("http")==-1))
		document.getElementById(containerid).innerHTML=unescape(page_request.responseText);
}

var steephill_movie_base_path = "http://www.grassyknolltv.com/movies/steephill/";

/*
function embed_steephill_movie(movie, w, h) {
	document.write('<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" codebase="http://www.apple.com/qtactivex/qtplugin.cab" height="' + h +'" width="' + w + '">');
 document.write('<param name="src" value="'+ steephill_movie_base_path + movie + '">');
 document.write('<param name="autoplay" value="true">');
 document.write('<param name="controller" value="true">');
 document.write('<embed height="'+ h + '" pluginspage="http://www.apple.com/quicktime/download/" src="'+ steephill_movie_base_path + movie +'" type="video/quicktime" width="' + w + '" controller="true" autoplay="true"> </object>');
}*/

/*
<video controls="" autoplay="" name="media" style="max-width: 100%; max-height: 100%;"><source src="http://www.grassyknolltv.com/movies/steephill/alpe-d-huez/etape-du-tour.mov" type="video/quicktime"></video>*/

function embed_steephill_movie(movie, w, h) {
	document.write('<video controls autoplay height="' + h +'" width="' + w + '">');
if (movie.indexOf ('http') == 0) // absolute url path
 	document.write('<source src="'+ movie + '" type="video/quicktime">');	
 else
	document.write('<source src="'+ steephill_movie_base_path + movie + '" type="video/quicktime">');
 document.write('</video>');
}


function img(file, caption, settings) {
	if (!settings.width)
		settings.width=320;
	if (!settings.align)
		settings.align = "left";
	if (!settings.margin) {
		if (settings.align == "left")
			settings.margin = "right";
		else
			settings.margin = "left";
	}
	if (!settings.mwidth) {
		settings.mwidth = 10;
	}
		if (!settings.image_name) {
		settings.image_name = file;
	}
		
	document.write('<table width=' + settings.width + ' cellpadding="2" align=' + settings.align + ' style="background-color:#c7c7c7;margin-' + settings.margin + ':' + settings.mwidth +'px">');
	
	document.write('<tr><td>');
	document.write('<img src=' + file + ' name=' + settings.image_name + ' width=' + settings.width + ' />');
	document.write('<br clear=left />');
	document.write('<div style="background-color:#c7c7c7;margin-top:5px;margin-right:0px;font:bold 12px arial;line-height:1.35em">');
	document.write(unescape(caption));
	document.write('<\/div><\/td><\/tr><\/table>');
}

function toggleDisplay(showID, hideID) {
			document.getElementById(showID).style.display='inline';
			document.getElementById(hideID).style.display='none';
			if (navigator.appName.indexOf("Microsoft") > -1 && parseInt(navigator.appVersion.charAt(0)) <= 8)
				 location.reload();
}

function velonewsbc(title,params) {
document.write('<img src="/video-red.gif"/>&nbsp;&nbsp;<a href=\"http://www.velonews.tv/?'+params+'#player\" onclick=\"click_track_explicit(this.href);NewWindow(this.href, \'velonews\',985,540, \'yes\'); return false;\">'+title+'</a> &mdash; <i>velonews</i><br/>');
}


function eurosportv1(title,id,time,lang) {
	if (lang == undefined)
		lang = "english";
	if (dashboard_title == undefined)
		dashboard_title="";
document.write('<img src="/video-red.gif"/>&nbsp;&nbsp;<a href=\"/players/eurosport/v1/?title='+escape(title+' - '+dashboard_title)+'&id='+id+'\" onclick=\"click_track_explicit(this.href);NewWindow(this.href, \'eurosport\',530,434, \'no\'); return false;\">'+title+'</a> ('+time+' '+lang+') &mdash; <i>eurosport</i><br/>');
}

function brightcove(title,id,player,time,lang) {
	if (lang == undefined)
		lang = "english";
	if (dashboard_title == undefined)
		dashboard_title="";
document.write('<img src="/video-red.gif"/>&nbsp;&nbsp;<a href=\"/players/brightcove/?title='+escape(title+' - '+dashboard_title)+'&id='+id+'&player='+player+'\" onclick=\"click_track_explicit(this.href);NewWindow(this.href, \'eurosport\',502,429, \'no\'); return false;\">'+title+'</a> ('+time+' '+lang+') &mdash; <i>'+player+'</i><br/>');
}
// -----------

var $ = function(id) {
	return document.getElementById(id);
};

function footer() {
	var script = document.createElement('script');
	script.setAttribute('src', 'http://www.google-analytics.com/urchin.js');
	script.setAttribute('type', 'text/javascript');
	$('body').appendChild(script);
	var script = document.createElement('script');
	//script.setAttribute('src', 'http://www.google-analytics.com/urchin.js');
	script.setAttribute('type', 'text/javascript');
	script.appendChild(document.createTextNode(' _uacct = "UA-1004399-1"; urchinTracker(); '))
	$('body').appendChild(script);
	//document.write('<script src="http://www.google-analytics.com/urchin.js" type="text/javascript"> </script> <script type="text/javascript"> _uacct = "UA-1004399-1"; urchinTracker(); </script>');
}

/*
function big_photos_links(link, hasPrologue, lastStage) {
	for (var i = 0; i <= lastStage; i++) {
		if (i == 0 && hasPrologue) {
			
		}
		else {
		
		}
	}
}*/

// eg. <script type="text/javascript">nos_player("Slotfase tweede etappe Parijs-Nice/Last 3 Km", "tcmid=tcm-5-914954", "03:34");</script>

function nos_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch, restricted to Netherlands?";
	_player(title, id, time, language, "nos", "nos", 405, dashboard);
};

http://nos.nl/embed/?id=v:616900&autoplay=1
// eg. <script type="text/javascript">nos_player2("Highlights", "477515", "02:45", "Dutch");</script>

function nos_player2(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch, restricted to Netherlands";
	_player(title, id, time, language, "720/nos", "nos", 405, dashboard);
};
// eg. <script type="text/javascript">gazzetta_player("Stage 1 TTT Highlights", "d34d8dea-4a71-11e0-bcfb-d5f7918a9976", "1:11");</script>

function gazzetta_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Italian";
	_player(title, id, time, language, "gazzetta", "gazzetta", 434, dashboard);
};

function gazzetta_player2(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Italian";
	_player(title, id, time, language, "720/gazzetta", "gazzetta", 434, dashboard);
};

 // eg. script type="text/javascript">versus_player("versus6", "Stage 2 Last Km", "EGXs38KQwr0STg8qb0a_otGAu5frDhOt/500/720", "01:00");</script>
 
function versus_player(version, title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, version, "versus", 500, dashboard);
};

// eg.  <script type="text/javascript">youtube3_player("Stage 5 Last 10 Kms", "ON_g2jwbRUA", "14:53", "france3", "French");</script>

function youtube3_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "youtube3", source, 470, dashboard);
};

function youtube3_audio_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "youtube3", source, 470, dashboard);
};

// eg. <script type="text/javascript">eurosport_player("Last Minute", "24854423", "01:00", "English, restricted to Europe");</script>
function eurosport_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English, restricted to Europe";
	_player(title, id, time, language, "eurosport", "eurosport", 405, dashboard);
};

function eurosport2_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English, restricted to Europe";
	_player(title, id, time, language, "720/eurosport", "eurosport", 405, dashboard);
};

function eurosport3_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English, restricted to Europe";
	_player(title, id, time, language, "720/eurosportbrightcove", "eurosport", 405, dashboard);
};

function eurosport4_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English, restricted to Europe";
	_player(title, id, time, language, "720/eurosport2020", "eurosport", 405, dashboard);
};


function yahoo_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/yahoo", source, 405, dashboard);
};

function yahoo2_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/yahoo2", "eurosport", 405, dashboard);
};

//<script type="text/javascript">eitb_player("Last Km of Stage 1", "861899", "03:01");</script> 
function eitb_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Basque";
	_player(title, id, time, language, "eitb", "eitb", 448, dashboard);
};

function eitb2_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Spanish";
	_player(title, id, time, language, "720/eitb", "eitb", 405, dashboard);
};

// eg. <script type="text/javascript">vimeo_player("Thor Hushovd recon from last month", "21598590", "03:08", "Mavic", "Music/subtitles");</script> 
function vimeo_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "vimeo720", source, 405, dashboard);
};

function fubo_vimeo_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/fubo-vimeo", source, 405, dashboard);
};

// <script type="text/javascript">cyclocosm_player("How the race was won - Stages 16-21", "115", "05:28");</script>
function cyclocosm_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cyclocosm", "cyclocosm", 405, dashboard);
};



// <script type="text/javascript">qt_player("Road to Roubaix Trailer HD 2008", "grassyknolltv.com/2011/paris-roubaix/R2R_Trailer_HR.mov", "03:01", "roadtoroubaix", "English");</script> 
function qt_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	if (id.indexOf(".mp3") > -1)
		_audio_player(title, id, time, language, "720/qt", source, 300, dashboard);
	else
		_player(title, id, time, language, "720/qt", source, 500, dashboard);
};

//<script type="text/javascript">mp3_player("The Recon Ride Podcast: Giro d’Italia 2015 Show, Part III", "http://media.blubrry.com/reconride/p/content.blubrry.com/reconride/The_Recon_Ride_Podcast_Giro_d_Italia_2015_Show_Part_III.mp3", "40:22", "velohuman");</script>
function mp3_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/mp3", source, 140, dashboard);
};


// <script type="text/javascript">dailymotion_player("Stage 1 Last 3 Kms", "xifxa8", "10:01", "eurosport", "English");</script> 
function dailymotion_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/dailymotion", source, 415, dashboard);
};

// <script type="text/javascript">letourdefrance_player("Stage 1 Last 3 Kms", "xifxa8", "10:01", "eurosport", "English");</script> 
function letourdefrance_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "/letourdefrance", source, 500, dashboard);
};

// <script type="text/javascript">vier_player("Stage 1 Last 3 Kms", "xifxa8", "10:01");</script> 
function vier_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_player(title, id, time, language, "720/vier", "vier.be", 405, dashboard);
};

 // eg. <script type="text/javascript">nbcsports_player("Bradley Wiggins Stage 5 ITT Highlights and Interview", "47227136,33399756", "02:21");</script>
function nbcsports_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/nbcsports", "nbcsports", 420, dashboard);
};

 // eg. <script type="text/javascript">msnbc_player("Bradley Wiggins Stage 5 ITT Highlights and Interview", "47227136,33399756", "02:21");</script>
function msnbc_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/msnbc", "msnbc", 420, dashboard);
};

 // eg. script type="text/javascript">versus_player("cbs13sacramento_player", "Stage 2 Last Km", "EGXs38KQwr0STg8qb0a_otGAu5frDhOt/500/720", "01:00");</script>
 
function cbs13sacramento_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cbs13sacramento", "cbs13sacramento", 612, dashboard);
};


 // eg. <script type="text/javascript">versus_player("cbsdenver_player", "Stage 2 Last Km", "EGXs38KQwr0STg8qb0a_otGAu5frDhOt/500/720", "01:00");</script>
 
function cbsdenver_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cbsdenver", "cbsdenver", 405, dashboard);
};


// <script type="text/javascript">bicycling_player("Chris Horner Previews Stage 8", "Chris-Horners-2011-Tour-of-Ca-5", "01:30");</script>
function bicycling_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/bicycling", "bicycling", 465, dashboard);
};

// <script type="text/javascript">9news_player("Chris Horner Previews Stage 8", "Chris-Horners-2011-Tour-of-Ca-5", "01:30");</script>
function nine_news_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/ninenews", "9news", 405, dashboard);
};

function universalsports_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English, restricted to U.S.";
	_player(title, id, time, language, "720/universalsports", "universalsports", 405, dashboard);
};

function cbs_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cbs", "cbs", 473, dashboard);
};

function cbs_player2(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cbs2", "cbs", 473, dashboard);
};

// <script type="text/javascript">wat_player("Stage 1 Last 3 Kms", "114520nIc0K116507163", "10:01");</script> 
function wat_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/wat", "eurosport", 405, dashboard);
};

// <script type="text/javascript">wat_player2("Stage 1 Last 3 Kms", "114520nIc0K116507163", "10:01");</script> 
function wat_player2(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/wat2", "eurosport", 405, dashboard);
};

// <script type="text/javascript">aso_tdf_2011_player("Stage 1 Last 3 Kms", "114520nIc0K116507163", "10:01");</script> 
function aso_tdf_2011_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/aso-tdf-2011", "aso", 500, dashboard);
};

// eg. <script type="text/javascript">rtl_player("Thor Hushovd recon from last month", "21598590", "03:08", "Mavic", "Music/subtitles");</script> 
function rtl_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/rtl", source, 405, dashboard);
};

// eg.  <script type="text/javascript">rai_player("Winning ITT ride from Stage 21", "634570eb-0052-4eb8-897f-9dd56aa8e36e", "04:42");</script>
function rai_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Italian";
	_player(title, id, time, language, "720/rai", "rai", 450, dashboard);
	//_link ("video", title, "http://www.rai.tv/dl/RaiTV/programmi/media/ContentItem-"+id+".html", "rai", time, language) ;
};

function raisport_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Italian, restricted to Italy";
	_player(title, id, time, language, "720/raisport", "raisport", 450, dashboard);
	//_link ("video", title, "http://www.rai.tv/dl/RaiTV/programmi/media/ContentItem-"+id+".html", "rai", time, language) ;
};

// eg. <script type="text/javascript">sbs_player("Stage 2 Highlights", "2234877871", "09:03");</script> 
function sbs_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/sbs", "sbs", 446, dashboard);
};


// eg. <script type="text/javascript">cbs5sf_player("Stage 2 Highlights", "7254245", "09:03");</script> 
function cbs5sf_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cbs5sf", "cbs5", 433, dashboard);
};

// eg. <script type="text/javascript">abclocal_player("Stage 2 Highlights", "7254245", "09:03");</script> 
function abclocal_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/abclocal", "abc", 454, dashboard);
};

// <script type="text/javascript">cbc_player("Interview with Ryder Hesjedal's dad", "2239838216", "04:56");</script> 
function cbc_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cbc", "cbc", 483, dashboard);
};

// <script type="text/javascript">sf_player("Interview with Ryder Hesjedal's dad", "2239838216", "04:56");</script> 
function sf_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "German";
	_player(title, id, time, language, "720/sf", "sf", 434, dashboard);
};

// <script type="text/javascript">soundcloud_player("Cycling Central Podcast w/ Anthony Tan, Mike Tomalaris, Alex Hinds", "5026696", "25:53");</script> 
function soundcloud_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/soundcloud", source, 180, dashboard);
};

// <script type="text/javascript">soundcloud_player("Cycling Central Podcast w/ Anthony Tan, Mike Tomalaris, Alex Hinds", "5026696", "25:53");</script> 
function audioboo_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/audioboom", source, 400, dashboard);
};
 
function libsyn_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/libsyn", source, 150, dashboard);
};


function whooshkaa_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/whooshkaa", source, 200, dashboard);
};

function yourlisten_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/yourlisten", source, 200, dashboard);
};

function npr_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/npr", "npr", 400, dashboard);
};

// <script type="text/javascript">lequipe_player("Stage 1 Last 3 Kms", "xifxa8", "10:01");</script> 
function lequipe_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "French";
	_player(title, id, time, language, "720/lequipe", "lequipe", 504, dashboard);
};

// <script type="text/javascript">cnn_player("Stage 1 Last 3 Kms", "xifxa8", "10:01");</script> 
function cnn_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cnn", "cnn", 400, dashboard);
};


// <script type="text/javascript">bicyclingbc_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function bicyclingbc_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/bicyclingbc", "bicycling", 404, dashboard);
};

// <script type="text/javascript">cyclingnewsbc_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function cyclingnewsbc_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cyclingnewsbc", "cyclingnews", 560, dashboard);
};

// <script type="text/javascript">cyclingweeklybc_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function cyclingweeklybc_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cyclingweeklybc", "cyclingweekly", 404, dashboard);
};

// <script type="text/javascript">nytimes_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function nytimes_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/nytimes", "nytimes", 560, dashboard);
};

/*function generic_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "generic", "aso", 500, dashboard);
};*/

//<script type="text/javascript">generic_player("Stage 5 Highlights and Interviews", "2012/tour-of-qatar/05-Flamme-Rouge-Media", "02:42", "flamme rouge media");</script>
function generic_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "generic", source, 500, dashboard);
};

// eg. <script type="text/javascript">nos_player2("Highlights", "477515", "02:45", "Dutch");</script>

function aolsports_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/aolsports", "aolsports", 444, dashboard);
};

// eg. <script type="text/javascript">cyclingtv_player("Highlights", "477515", "02:45");</script>

function cyclingtv_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/cyclingtv", "cycling.tv", 440, dashboard);
};

function newstalk_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/newstalk", "newstalk", 180, dashboard);
};

function nbcsports_player2(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/nbcsports2", "nbcsports", 444, dashboard);
};

function nbcsports_player3(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/nbcsports3", "nbcsports", 444, dashboard);
};

function nbcsports_player4(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/nbcsports4", "nbcsports", 444, dashboard);
};

// <script type="text/javascript">sportsnet_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function sportsnet_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/sportsnet", "sportsnet", 404, dashboard);
};

function focus_wtv_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_player(title, id, time, language, "720/focus-wtv", "focus-wtv", 400, dashboard);
};

function focus_wtv_player2(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_player(title, id, time, language, "720/focus-wtv2", "focus-wtv", 400, dashboard);
};

function focus_wtv_player3(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_player(title, id, time, language, "720/focus-wtv3", "focus-wtv", 400, dashboard);
};




function rtvoost_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_player(title, id, time, language, "720/rtvoost", "rtvoost", 405, dashboard);
};

function telemb_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "French";
	_player(title, id, time, language, "720/telemb", "telemb.be", 405, dashboard);
};

function sporza_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_link("video", title, "http://www.sporza.be/permalink/"+id, "sporza", time, language);
	//_player(title, id, time, language, "720/sporza", "sporza", 405, dashboard);
};

function sporza2_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	//_link("video", title, "http://www.sporza.be/permalink/"+id, "sporza", time, language);
	_player(title, id, time, language, "720/sporza2", "sporza", 405, dashboard);
};

function rtve_player(title, id, time, language, dashboard){
	if (language === undefined) {
		language = "Spanish, restricted to Spain";
		
	}
	//_link("video", title, "http://www.rtve.es/v/"+id + "/", "rtve", time, language);
//else
		_player(title, id, time, language, "720/rtve", "rtve", 440, dashboard);	
};

function esport3_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Catalan";
	_player(title, id, time, language, "720/esport3", "esport3", 448, dashboard);
};

function ccma_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Catalan";
	_player(title, id, time, language, "720/ccma", "esport3", 404, dashboard);
};

function trtspor_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Turkish";
	_player(title, id, time, language, "720/trtspor", "trtspor", 390, dashboard);
};

function espndeportes_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Spanish";
	_player(title, id, time, language, "720/espndeportes", "espn", 425, dashboard);
};

function espn_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/espn", "espn", 425, dashboard);
};

function francetvinfo_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "French";
	_player(title, id, time, language, "720/francetvinfo2", "francetv", 405, dashboard);
};

function sportpl_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Polish";
	_player(title, id, time, language, "720/sportpl", "sport.pl", 415, dashboard);
};

//<script type="text/javascript">vine_player("Champagne eruption scares winner's son on the podium ", "OlxAFLWxjVh", "00:09");</script>
function vine_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Ambient Noise";
	_player(title, id, time, language, "720/vine", "vine", 440, dashboard);
};

// eg.  <script type="text/javascript">ustream_player("Stage 5 Last 10 Kms", "51319288", "14:53", "vueltaburgos", "Spanish");</script>

function ustream_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/ustream", source, 455, dashboard);
};

// eg.   <script type="text/javascript">tvasports_player("GP cyclistes: lancement officiel des activités", "3778565750001", "04:51");</script>
function tvasports_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "French";
	_player(title, id, time, language, "720/tvasports", "tvasports", 420, dashboard);
};

// <script type="text/javascript">pinkbike_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function pinkbike_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Music";
	_player(title, id, time, language, "720/pinkbike", "pinkbike", 405, dashboard);
};

// <script type="text/javascript">epictv_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function epictv_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/epictv", "epictv", 405, dashboard);
};

// <script type="text/javascript">limburg_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function limburg_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_player(title, id, time, language, "720/limburg", "limburg", 540, dashboard);
};

// <script type="text/javascript">limburg_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function vzaar_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/vzaar", source, 405, dashboard);
};

// <script type="text/javascript">redbull_player("Frankie and James Prologue Analysis", "1713193158001", "10:01");</script> 
function redbull_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/redbull", "redbull", 404, dashboard);
};

// <script type="text/javascript">dailymotion_player("Stage 1 Last 3 Kms", "xifxa8", "10:01", "eurosport", "English");</script> 
function dmcloud_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/dmcloud", source, 400, dashboard);
};

// <script type="text/javascript">facebook_player("Stage 1 Last 3 Kms", "xifxa8", "10:01", "eurosport", "English");</script> 
function facebook_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/facebook", source, 405, dashboard);
};

// <script type="text/javascript">facebook_player2("Stage 1 Last 3 Kms", "https://www.facebook.com/globalcyclingnetwork/videos/298149694188225/", "10:01", "gcn", "English");</script> 
function facebook_player2(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/facebook2", source, 405, dashboard);
};

// <script type="text/javascript">rtbf_player("Stage 1 Last 3 Kms", "xifxa8", "10:01");</script> 
function rtbf_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "French";
	_player(title, id, time, language, "720/rtbf", "rtbf", 210, dashboard);
		//_link("video", title, "http://www.rtbf.be/video/embed?id="+id+"&amp;autoplay=1", "rtbf", time, language);
};

// <script type="text/javascript">rtbf2_player("Stage 1 Last 3 Kms", "xifxa8", "10:01");</script> 
function rtbf2_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "French";
	_player(title, id, time, language, "720/rtbf2", "rtbf", 405, dashboard);
		//_link("video", title, "http://www.rtbf.be/video/embed?id="+id+"&amp;autoplay=1", "rtbf", time, language);
};

function nos_player3(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
		_link("video", title, id, "nos", time, language);
};


function vitalmtb_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Music";
	_player(title, id, time, language, "720/vitalmtb", "vitalmtb", 406, dashboard);
};

function vidme_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/vidme", source, 406, dashboard);
};

function streamable_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/streamable", source, 406, dashboard);
};

function corriere_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Italian";
	_player(title, id, time, language, "720/corriere", "corriere", 453, dashboard);
};

function wat3_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/wat3", "eurosport", 406, dashboard);
};

function twitter_video_player(title, id, time, language, source, dashboard){
	if (language === undefined)
		language = "English";
	if (!(source === undefined) && (source != null))
		_player(title, id, time, language, "720/twitter", source, 440, dashboard);
	else	
		_player(title, id, time, language, "720/twitter", "@"+id.split("/")[0], 440, dashboard);
};

function redbull_player2(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/redbull2", "redbull", 406, dashboard);
};

/*
<script src='//player.ooyala.com/v3/8a0502dfd94f4631a70e81dd6d8cee7e'></script>
<div id='ooyalaplayer_1525108768' style='width:1280px;height:720px'></div>
<script>
  OO.ready(function() { OO.Player.create('ooyalaplayer_1525108768', 'EwYW81ZjE6nUgrud1_xjuPoZHau888jW'); });
</script>
<noscript><div>Please enable Javascript to watch this video</div></noscript> 

<script type="text/javascript">flobikes_player("On-Demand Broadcast from Stage 4", "xifxa8", "1:30:00");</script> 
*/
function flobikes_player(title, ids, time, language, dashboard){
	if (language === undefined)
		language = "English,  North America subscription";
	_player(title, ids, time, language, "720/flobikes", "flobikes", 406, dashboard);
};

//<script type="text/javascript">fubotv_player("On-Demand Broadcast from Stage 4", "xifxa8", "1:30:00");</script>  Giro2018_Stage1_Highlights

function fubotv_player(title, ids, time, language, dashboard){
	if (language === undefined)
		language = "English, restricted to North America";
	_player(title, ids, time, language, "720/fubotv", "fubotv", 406, dashboard);
};

//<script type="text/javascript">sport5_player("On-Demand Broadcast from Stage 4", "xifxa8", "1:30:00");</script>  Giro2018_Stage1_Highlights
function sport5_player(title, ids, time, language, dashboard){
	if (language === undefined)
		language = "Hebrew";
	_player(title, ids, time, language, "720/sport5", "sport5", 406, dashboard);
};



function tweet_player(title, id, dashboard){

	if (dashboard === undefined) {
		dashboard = local_dir;
	}
	
	document.write('<a class=twitter href="/players/tweet/?title='+title.replace(/ /g, '+')+'&dashboard='+dashboard+'&id='+id+'&yr='+year+'"    onclick="click_track_explicit(this.href);NewWindow(this.href, \''+"tweet"+'\',782, '+650+', \'no\'); return false;">'+title+'</a>');
		document.write(' &mdash; <i>'+"@"+id.split("/")[0]+'</i>');
	document.write('<br/>');
};

function tweet_photo(title, id, dashboard){

	if (dashboard === undefined) {
		dashboard = local_dir;
	}
	
	document.write('<a class=photos href="/players/tweet/?title='+title.replace(/ /g, '+')+'&dashboard='+dashboard+'&id='+id+'&yr='+year+'"    onclick="click_track_explicit(this.href);NewWindow(this.href, \''+"tweet"+'\',782, '+650+', \'no\'); return false;">'+title+'</a>');
		document.write(' &mdash; <i>'+"@"+id.split("/")[0]+'</i>');
	document.write('<br/>');
};

function vtm_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Dutch";
	_player(title, id, time, language, "720/vtm", "vtm", 405, dashboard);
};

function worldcyclingleague_player(title, id, time, dashboard){
	_player(title, id, time, "English", "720/worldcyclingleague", "wcl", 405, dashboard);
};

function instagram_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "Ambient Noise";
	_player(title, id, time, language, "720/instagram", source, 405, dashboard);
};

function livestream_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	//_link("video", title, "http://www.sporza.be/permalink/"+id, "sporza", time, language);
	_player(title, id, time, language, "720/livestream", source, 420, dashboard);
};

function velonews_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/velonews", "velonews", 405, dashboard);
};

function pmg_sport_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Italian";
	_player(title, id, time, language, "720/pmg-sport", "pmgsport", 405, dashboard);
};

function canalsur_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "Spanish";
	_player(title, id, time, language, "720/canalsur", "canalsur", 405, dashboard);
};

// <script type="text/javascript">soundcloud_player("Cycling Central Podcast w/ Anthony Tan, Mike Tomalaris, Alex Hinds", "5026696", "25:53");</script> 
function acast_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id+"&source="+source, time, language, "720/acast", source, 300, dashboard);
};


// <script type="text/javascript">html5_player("Last Km of Amstel Gold Race", "https://tv2-dk-clips.secure.footprint.net/vod/mpx/TV2dk/197/634/Valgrenvinder1504rikd.mp4", "01:45", "TV2.dk", "Danish");</script>
function html5_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/html5", source, 405, dashboard);
};

function skysports_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/skysports", "skysports", 405, dashboard);
};

function globalnews_player(title, id, time, language, dashboard){
	if (language === undefined)
		language = "English";
	_player(title, id, time, language, "720/globalnews", "globalnews", 405, dashboard);
};

// <script type="text/javascript">podbean_player("Review of the year and interviews with Porte and van Garderen", "rew3e-804b24", "10:01");</script> 
function podbean_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/podbean", source, 405, dashboard);
};

function spreaker_player(title, id, time, source, language, dashboard){
	if (language === undefined)
		language = "English";
	_audio_player(title, id, time, language, "720/spreaker", source, 435, dashboard);
};



function _link (clazz, title, url, source, time, language ) {
	var s = '<a class="'+ clazz + '" href="' + url + '">' + title + '</a> ';
	var hasTime = false;
	if (!(time === undefined 
	|| time == null || time=="00:00" || time=="0")) { 
		s +=  '<small>(' + time + ' ';
		hasTime = true;
	}
	if (!(language === undefined || language == null)) {
		if (hasTime == false)
			s +=  '<small>(';	 
		s += language + ')</small>';
	}

	document.write(s);
	if (source != "")
		document.write(' &mdash; <i>'+source+'</i>');
	document.write('<br/>');
};


function _player (title, id, time, language, player, source, height, dashboard) {
	var today = new Date();
	if (dashboard === undefined) {
			dashboard = local_dir;
	}
	if (window.year === undefined) {
 		year = today.getFullYear();
	}
	document.write('<a class=video href="/players/'+player+'/?title='+title.replace(/ /g, '+')+'&dashboard='+dashboard+'&id='+id+'&yr='+year+'"    onclick="click_track_explicit(this.href);NewWindow(this.href, \''+source+'\',782, '+(height+225)+', \'no\'); return false;">'+title+'</a>');
	if (language != "") {
		if (time != "")
			document.write(' <small>(' + time + ' ' + language + ')</small>');
		else
			document.write(' <small>(' + language + ')</small>');
	}
	if (source != "")
		document.write(' &mdash; <i>'+source+'</i>');
	document.write('<br/>');
};

function _audio_player (title, id, time, language, player, source, height, dashboard) {
	var today = new Date();
	if (dashboard === undefined) {
		dashboard = local_dir;
	}
	document.write('<a class=audio href="/players/'+player+'/?title='+title.replace(/ /g, '+')+'&dashboard='+dashboard+'&id='+id+'&yr='+today.getFullYear()+'"    onclick="click_track_explicit(this.href);NewWindow(this.href, \'audio\',782, '+(height+220)+', \'no\'); return false;">'+title+'</a> <small>(' + time + ' ' + language + ')</small>');
	if (source != "")
		document.write(' &mdash; <i>'+source+'</i>');
	document.write('<br/>');
};



function pad(direction, pattern, value) {
	var s = new String(value);
	if (pattern.length == s.length)
		return s;
		
	var a = pattern.split("");
	if (direction == "left") {
		for (var i = 0; i < s.length; i++)
			a[a.length-i-1] = s.charAt(s.length-i-1);
	}
	else {
		for (var i = 0; i < s.length; i++)
			a[i] = s.charAt(i);	
	}
	return a.join("");	
}

function make_calendar_live_video_links (relative_live_links){
	for (var i = 0; i < relative_live_links.length; i++) {
		if (i > 0)
			document.write(', ');
		document.write("<a " + ((i == 0) ? 'class=video ' : '') + ((relative_live_links[i].indexOf('http') < 0) ? "href=http://sports"+"-"+"live"+"z.com/" : "href=") + relative_live_links[i] + " target=_blank >");
		document.write((i == 0) ? 'Live Video' : '['+(i+1)+']');	
		document.write('</a>');	
	}
}

function loadScript(url, callback){

    var script = document.createElement("script")
    script.type = "text/javascript";
    script.setAttribute("charset", "utf-8");

    if (script.readyState){  //IE
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" ||
                    script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {  //Others
        script.onload = function(){
            callback();
        };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

function big_photos_url(title, url, source, status, timestamp) {
	var buffer = '<a class=photos href="' + url + '" >' + title +'</a>';
	
	var currentDate = new Date();
	if (typeof timestamp == 'undefined' || timestamp == 0) {
		var tsDate = currentDate;
	}
	else {
		//document.write(timestamp+'<br/>');
		var tsDate = new Date(Date.parse(timestamp));
	}
	//document.write((new Date(tsDate)).toUTCString()+'<br/>');
	
	if (typeof status !== 'undefined' && diffDays(tsDate, currentDate) < 1) {
		if (status == "more photos added" || status == "just added" || status == "descriptions added")
			buffer += " <font color=red >(" + status + ")</font>";
		else
			buffer += " (" + status + ")";	
	}

	buffer += ' &mdash; <i>' + source + '</i><br/>';
	document.write(buffer);
}

/*
function dateDiff(dateEarlier, dateLater) {
    var one_day=1000*60*60*24
    return (  Math.round((dateLater.getTime()-dateEarlier.getTime())/one_day)  );
}*/

function diffDays(date0, date1) {
	var millisecondsPerDay = 1000 * 60 * 60 * 24;
    var millisBetween = date1.getTime() - date0.getTime();
    var days = millisBetween / millisecondsPerDay;

    // Round down.
    return Math.floor(days);
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

String.prototype.valueForKey = function (find, endDelimiter, hasDoubleQuotes) {
	var start = this.indexOf(find) + find.length;
	if (endDelimiter === undefined) {
		var end = this.length;
	}
	else
		var end = this.indexOf(endDelimiter, start);
	if (!(hasDoubleQuotes === undefined) && hasDoubleQuotes)
		return this.substring(start + 1, end - 1);
	else
    	return this.substring(start, end);
};

String.prototype.splitAndGet = function (delimiter, index) {
	var components = this.split(delimiter);
	return components[index];
};



