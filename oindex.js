<html>
  <body>
  <font size=4><div id="where"></div></font>
  <img id="picture" src="">
  <font size=3><div id="what"></div></font>
  <font size=3><div id="inventory"></div></font>
  <font size=3><div id="next"></div></font>
  <script src="http://code.jquery.com/jquery-1.10.2.min.js"></script>
  <script>
    $(function() {
      $("#where").html("booting...");
      where = "strong-hall";

      function refresh() {
        $.get("/" + where, function (data) {
           $("#where").html(data.text);
           $("#picture").attr("src","images/" + data.where);
           if (data.what == undefined || data.what.length == 0) {
              $("#what").html("");
           } else {
              $("#what").html("You can see : ");
              for(var i in data.what) {
                var item = data.what[i];
                $("#what").append(item);
                button = $("<button/>");
                button.text("Take " + item);
                (function(button,where,item) {
                  button.click(function() {
                    $.ajax("/" + where + "/" + item,
                        { success : refresh
                        , type : "DELETE"
                        }
                    );
                    refresh();
                  });
                })(button,where,item);
                $("#what").append(button);
              }
          }

          $("#next").html("");
          for(var i in data.next) {
            $("#next").append(i);
            button = $("<button/>");
            button.text("Go " + i);
            (function(button,dest) {
              button.click(function() {
                where = dest;
                refresh();
              });
            })(button,data.next[i]);
            $("#next").append(button);
          }


        });
        $.get("/inventory",function (data) {
          if (data == undefined || data.length == 0) {
             $("#inventory").html("You are not carrying anything");
          } else {
             $("#inventory").html("You are carrying : ");
             for(var i in data) {
               var item = data[i];
               $("#inventory").append(item);
               button = $("<button/>");
               button.text("Drop " + item);
                (function(button,where,item) {
                  button.click(function() {
                    $.ajax("/" + where + "/" + item,
                        { success : refresh
                        , type : "PUT"
                        }
                    );
                    refresh();
                  });
                })(button,where,item);
               $("#inventory").append(button);
            }
          }
        });
      }

      refresh();

    });
  </script>
  </body>
</html>
