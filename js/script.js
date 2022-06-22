/*********************************************************************************************
* 初始化变量
*********************************************************************************************/
var myZCloudID = "817214415179";                                   // 智云帐号
var myZCloudKey = "CQcGBAIMAAcFAwUMQxNBU11dUFhBEw0ZDAYFBAYMAAQMARsZGl9WX1QWDhEXXUJKURNKVw";                 // 智云密钥
var mySensorMac = "11:45:14:00:01:14:51:14";                    // 鱼缸节点MAC地址

var channel = `${mySensorMac}_A1`;                              // 传感器数据通道
var channelph = `${mySensorMac}_A0`;
var rtc = new WSNRTConnect(myZCloudID, myZCloudKey);            // 创建数据连接服务对象
var myHisData = new WSNHistory(myZCloudID, myZCloudKey);        // 创建历史数据服务对象
var tem;
var ph;

/*********************************************************************************************
* 与智云服务连接，并监听和解析实时数据并显示
*********************************************************************************************/
$(function(){
  rtc.setServerAddr("api.zhiyun360.com:28080");                 // 设置服务器地址
  rtc.connect();
  rtc.onConnect = function() {                                  // 连接成功回调函数
    rtc.sendMessage(mySensorMac, "{A1=?,A0=?}");// 查鱼缸初始值
    $("#ConnectState").text("数据服务连接成功！");
  };

  rtc.onConnectLost = function() {                              // 数据服务掉线回调函数
    $("#ConnectState").text("数据服务掉线！");
  };

  rtc.onmessageArrive = function(mac, dat) {                    // 消息处理回调函数
  console.log(mac+" >>> "+dat);
    
    if (mac == mySensorMac) {                                   // 判断传感器Mac地址
      if (dat[0] == '{' && dat[dat.length - 1] == '}') {        // 判断字符串首尾是否为{}
        dat = dat.substr(1, dat.length - 2);                    // 截取{}内的字符串
        var its = dat.split(',');                               // 以‘,’来分割字符串
        for (var x in its) {
          var t = its[x].split('=');                            // 以‘=’来分割字符串
          if (t.length != 2) continue;
          if (t[0] == "A1") {                                   // 判断参数A1
            tem = parseInt(t[1]);
            $("#currentTem").text(tem + "℃");// 在页面显示温度数据
            if (tem<20){$("#note1").text("水温过低")}
            else if (tem>50){$("#note1").text("水温过高")}
            else if (tem>20&&tem<50){$("#note1").text("水温正常")}
          }
          if (t[0] == "A0") {                                   // 判断参数A0
            ph = parseInt(t[1]);
            $("#currentph").text(ph + "ph");      // 在页面显示ph数据
            if (ph<4||ph>9){$("#note").text("该换水了");
              rtc.sendMessage(mySensorMac, "{OD1=128,D1=?}"); }
            else if (ph>4&&ph<9){$("#note").text("水质正常");}
          }
          if (t[0] == "D1"){                      //判断参数d1
            var DumpStatus = parseInt(t[1]);      //根据D1的值进行开关的切换
            if ((DumpStatus & 128) == 128||(DumpStatus & 128) == 128){
              $('#btn_img').attr('src','images/on.gif')
              $("#buttenon").text("开")
            }
            else if ((DumpStatus & 128) == 0){
              $('#btn_img').attr('src','images/off.gif')
              $("#buttenon").text("关")
            }
          }
          if (t[0] == "D1"){                      //判断参数d1
            var DumpStatus = parseInt(t[1]);      //根据D1的值进行开关的切换
            if ((DumpStatus & 64) == 64){
              $('#feed').attr('src','images/feedon.png')

            }
            else if ((DumpStatus & 64) == 0){
              $('#feed').attr('src','images/feedoff.png')
              
            }
          }
        }
      }
    }
  };
})

/*********************************************************************************************
* 默认调用历史数据图表，初参数为下拉选项初始值
*********************************************************************************************/
checkHistory('MessSet', '#line_charts');
checkphHistory('PHMessSet', '#line_PHcharts');
/*********************************************************************************************
* 下拉选项切换历史数据时间范围
*********************************************************************************************/
$('#MessSet').change(function () {
  checkHistory('MessSet', '#line_charts');
})
$('#MessSet').change(function () {
  checkphHistory('MessSet', '#line_PHcharts');
})
/*********************************************************************************************
* 名称：checkHistory(set, tagIndex, hisDiv)
* 功能：连接调用历史数据
* 参数：set：获取选中的历史数据时间范围
*       tagindex：判断后赋值给对应的历史查询对象
*       hisdiv：显示图表的节点
* 返回：无
* 修改：
* 注释：
*********************************************************************************************/
function checkHistory(set, hisDiv) {  
  var time = $('#' + set).val();                                // 设置时间
  myHisData.setServerAddr("api.zhiyun360.com:8080");            // 设置服务器地址

  console.log('查询时间为：' + time + '，查询通道为：' + channel);
  myHisData[time](channel, function (dat) {
    console.log(dat)                                            // 输出查询到的历史数据
    if (dat.datapoints.length > 0) {
      var data = DataAnalysis(dat);                             // JSON数据转化为图表数据
      showChart(hisDiv, 'spline', '', false, eval(data));       // 显示图表数据曲线
    }
  });
}
/**ph值历史记录 **/
function checkphHistory(set, hisDiv) {
  var time = $('#' + set).val();                                // 设置时间
  myHisData.setServerAddr("api.zhiyun360.com:8080");            // 设置服务器地址

  console.log('查询时间为：' + time + '，查询通道为：' + channelph);
  myHisData[time](channelph, function (dat) {
    console.log(dat)                                            // 输出查询到的历史数据
    if (dat.datapoints.length > 0) {
      var data = DataAnalysis(dat);                             // JSON数据转化为图表数据
      showChart(hisDiv, 'spline', '', false, eval(data));       // 显示图表数据曲线
    }
  });
}

/*********************************************************************************************
* 将JSON格式的数据转换成[x1,y1],[x2,y2],[x3,y3]...格式的数组（历史数据图表相关）
*********************************************************************************************/
function DataAnalysis(data, timezone) {
  var str = '';
  var value;
  var len = data.datapoints.length;
  if (timezone == null) {
    timezone = "+8";
  }
  var zoneOp = timezone.substring(0, 1);
  var zoneVal = timezone.substring(1);
  var tzSecond = 0;
  $.each(data.datapoints, function (i, ele) {
    if (zoneOp == '+') {
      value = Date.parse(ele.at) + tzSecond;
    }
    if (zoneOp == '-') {
      value = Date.parse(ele.at) - tzSecond;
    }
    if (ele.value.indexOf("http") != -1) {
      str = str + '[' + value + ',"' + ele.value + '"]';
    } else {
      str = str + '[' + value + ',' + ele.value + ']';
    }
    if (i != len - 1)
      str = str + ',';
  });
  return "[" + str + "]";
}

/*********************************************************************************************
* 画曲线图的方法（历史数据图表相关）
*********************************************************************************************/
function showChart(sid, ctype, unit, step, data) {
  $(sid).highcharts({
    chart: {
      backgroundColor: 'transparent',
      type: ctype,
      animation: false,
      zoomType: 'x'
    },
    legend: {
      enabled: false
    },
    title: {
      text: ''
    },
    xAxis: {
      type: 'datetime',
      labels: {
        style: {
          color: 'rgb(0, 0, 0)',
        }
      }
    },
    yAxis: {
      title: {
        text: ''
      },
      minorGridLineWidth: 0,
      gridLineWidth: 1,
      alternateGridColor: null,
      labels: {
        style: {
          color: 'rgb(0, 0, 0)',
        }
      }
    },
    tooltip: {
      formatter: function () {
        return '' +
        Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br><b>' + this.y + unit + '</b>';
      }
    },
    plotOptions: {
      spline: {
        lineWidth: 2,
        states: {
          hover: {
            lineWidth: 3
          }
        },
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              symbol: 'circle',
              radius: 3,
              lineWidth: 1
            }
          }
        }
      },
      line: {
        lineWidth: 1,
        states: {
          hover: {
            lineWidth: 1
          }
        },
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true,
              symbol: 'circle',
              radius: 3,
              lineWidth: 1
            }
          }
        }
      }
    },
    series: [{
      marker: {
        symbol: 'square'
      },
      data: data,
      step: step,
    }],
    navigation: {
      menuItemStyle: {
        fontSize: '10px'
      }
    }
  });
}
/*********************************************************************************************
 * 处理按键事件
 *********************************************************************************************/
$('#btn_img').click(function(){
  if($('#btn_img').attr('src') == 'images/on.gif'){
    rtc.sendMessage(mySensorMac, "{CD1=128,D1=?}");                   // 发送关闭水泵指令
  }else{
    rtc.sendMessage(mySensorMac, "{OD1=128,D1=?}");                   // 发送打开水泵指令
  }
})
$('#feed').click(function(){
  if($('#feed').attr('src') == 'images/feedon.png'){
    rtc.sendMessage(mySensorMac, "{CD1=64,D1=?}");                   // 发送关闭水泵指令
  }else{
    rtc.sendMessage(mySensorMac, "{OD1=64,D1=?}");                   // 发送打开水泵指令
  }
})