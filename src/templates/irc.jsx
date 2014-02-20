/** @jsx React.DOM */

app.components.irc = function() {
  var User = React.createBackboneClass({
    render: function() {
      return (
        <div className="user">
          <span className={this.getModel().isActive()}>
            <i className="fa fa-circle"></i>
          </span>
          <span>{this.getModel().get("type")}{this.getModel().get("nick")}</span>
          <span className="lastActive">{this.getModel().getActive()}</span>
        </div>
      )
    }
  });
  
  var UserList = React.createBackboneClass({
    render: function() {
      return (
        <div className="userList">
          <div className="titlebar">
            <strong>User List</strong>
          </div>
          {this.getModel().sortAll().map(function(user) {
            return <User model={user} />
          })}
        </div>
      );
    }
  });

  var TitleBar = React.createBackboneClass({
    render: function() {
      return (
        <div className="titlebar">
          <strong>{this.getModel().get("name")}</strong>
          <span>  {this.getModel().get("topic")}</span>
        </div>
      );
    }
  });

  var PartMessage = React.createBackboneClass({
    render: function() {
      return (
        <div className={this.getModel().getClass()}>
          <div><i className="fa fa-sign-out"></i><strong>{this.getModel().get("nick")}</strong> has left ({this.getModel().get("text")})</div>
        </div>
      );
    }
  });

  var JoinMessage = React.createBackboneClass({
    render: function() {
      return (
        <div className={this.getModel().getClass()}>
          <div><i className="fa fa-sign-in"></i><strong>{this.getModel().get("nick")}</strong> has joined</div>
        </div>
      );
    }
  });

  var TopicMessage = React.createBackboneClass({
    render: function() {
      return (
        <div className={this.getModel().getClass()}>
          <div><i className="fa fa-info-circle"></i><strong>{this.getModel().get("nick")}</strong> has changed the topic to "{this.getModel().get("text")}"</div>
        </div>
      );
    }
  });

  var Message = React.createBackboneClass({
    render: function() {
      return (
        <div className={this.getModel().getClass()}>
          <div className="messageAuthor">
            {this.getModel().get("from")}
          </div>
          <div className="messageText" dangerouslySetInnerHTML={{__html: this.getModel().getText()}}>
          </div>
          <div className="messageTimestamp">
            {this.getModel().get("timestamp") ? moment(this.getModel().get("timestamp")).format(app.settings.time_format) : ""}
          </div>
        </div>
      );
    }
  });

  var Messages = React.createBackboneClass({

    componentWillUpdate: function() {
      var node = this.getDOMNode();
      this.shouldScrollBottom = node.scrollTop + node.offsetHeight === node.scrollHeight;
    },

    componentDidUpdate: function() {
      if (this.shouldScrollBottom) {
        var node = this.getDOMNode();
        $(node).animate({scrollTop: node.scrollHeight}, 750);
      }
    },

    render: function() {
      return (
        <div className="messages">
          {this.getModel().map(function(message) {
            switch (message.get("type")) {
              case "PRIVMSG":
                return <Message model={message} />
              case "NOTICE":
                return <Message model={message} />
              case "PART":
                return <PartMessage model={message} />
              case "JOIN":
                return <JoinMessage model={message} />
              case "TOPIC":
                return <TopicMessage model={message} />
            }
          })}
        </div>
      );
    }
  });

  var MessageInput = React.createBackboneClass({
    handleInput: function(ev) {
      // If the user pushed enter
      if (ev.keyCode === 13) {
        var server = app.irc.connections.get(app.irc.connections.active_server);
        var target = app.irc.connections.active_channel;

        var output = $(ev.target).val();
        // If the first character is a slash
        if (output[0] === "/") {
          // Stript the slash but emit the rest as a command
          app.io.emit("command", {server: server.get("name"), target: target, command: output.substring(1)});
        } else {
          app.io.emit("say", {text: output, server: server.get("name"), target: target});
          server.addMessage(target, {from: server.get("nick"), text: output, type: "PRIVMSG"});
        }
        $(ev.target).val("");
      }
    },

    render: function() {
      return (
        <div className="messageInput">
          <input onKeyUp={this.handleInput} />
          <a className="button">Send</a>
        </div>
      );
    }
  });

  var Chat = React.createBackboneClass({
    render: function() {
      return (
        <div className="chat">
          <TitleBar model={this.getModel()} />
          <Messages model={this.getModel().get("messages")} />
          <MessageInput />
        </div>
      )
    }
  });

  var App = React.createBackboneClass({
    getChannel: function() {
      var connections = this.getModel();
      var server = connections.get(connections.active_server);
      var channel = server.get("channels").get(connections.active_channel);
      return channel;
    },

    render: function() {
      return (
        <div className="app">
          <Chat model={this.getChannel()} />
          <UserList model={this.getChannel().get("users")} />
        </div>
      );
    }
  });

  var Connection = React.createBackboneClass({
    isActive: function(chan) {
      var connections = this.getModel().collection;
      // Check to see if the channel is currently the active one
      return (connections.active_server === this.getModel().get("name") &&
              connections.active_channel === chan.get("name"))
    },

    setActive: function(event) {
      var connections = this.getModel().collection;
      connections.active_server = this.getModel().get("name");
      connections.active_channel = $(event.target).closest("li").attr("data-channel");

      // Clear notifications highlights and unreads
      this.getModel().get("channels").get(connections.active_channel).clearNotifications();

      connections.trigger("sort");
    },

    render: function() {
      var _this = this;
      return (
        <div className="nav_connection">
          <div className="server_name">
            <span>{this.getModel().get("name")}</span>
          </div>
          <div className="server_nick">
            <span>{this.getModel().get("nick")}</span>
          </div>
          <ul>
            {this.getModel().get("channels").map(function(chan) {
              return (
                <li data-channel={chan.get("name")} onClick={_this.setActive} className={_this.isActive(chan) ? "active" : "" }>
                  {chan.get("name")}
                  {function() {
                    if (chan.get("unread")) {
                      return (
                        <span className="unread">{chan.get("unread")}</span>
                      )
                    }
                  }()}
                  {app.settings.highlights.map(function(highlight) {
                    if (chan.get(highlight.name)) {
                      return (
                        <span className={"unread_" + highlight.name + " unread_highlight" }>{chan.get(highlight.name)}</span>
                      )
                    }
                  })}
                </li>
              )
            })}
          </ul>
        </div>
      );
    }
  });

  var SideNav = React.createBackboneClass({
    render: function() {
      return (
        <div>
          {this.getModel().map(function(conn) {
            return <Connection model={conn} />
          })}
        </div>
      );
    }
  });

  this.show = function() {
    var nav = SideNav({
      model: window.app.irc.connections
    });
    React.renderComponent(nav, $(".nav-area").get(0))

    var app = App({
      model: window.app.irc.connections
    });
    React.renderComponent(app, $("main").get(0))
  };
}