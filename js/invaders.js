(function($) {

  var LEFT     = -1, 
      RIGHT    = 1, 
      keyCodes = {
        LEFT:  37,
        UP:    38,
        RIGHT: 39,
        DOWN:  40,
        SPACE: 32,
        ESC:   27
      },
      canvas, ctx, 
      invaders, ship, alien;
  
  function atEdge() {
    if (this.direction == RIGHT) {
      return this.x >= (canvas.width - this.width);
    };
    return this.x <= 0;
  };
  
  Array.prototype.random = function() { 
    var idx = Math.round(Math.random() * (this.length - 1));
    return this[idx];
  };
  
  var Sprite = function(options) {
    return $.extend({
      // defaults
      image:   new Image(),
      src:     null,
      loaded:  false,
      width:   0,
      height:  0,

      init: function() { this.load(); },
      
      load: function() {
        var self = this;      
        this.image.onload = function() { self.loaded = true; };
        this.image.src    = this.src;
      },
      
      draw: function (x, y) {
        if (this.loaded) {
          ctx.drawImage(this.image, x, y, this.width, this.height);
        }
      }
      
    }, options);
  };
  
  var Enemy = function(options) {
    return $.extend({
      dead: false,
      fleet: invaders,
      x1: function() { return this.x + this.fleet.x; },
      x2: function() { return this.x1() + littleAlien.width; },
      y1: function() { return this.y + this.fleet.y; },
      y2: function() { return this.y1() + littleAlien.height; }
    }, options);
  };
  
  $.game = {
    paused: false,
    
    keyup: function(e) {
      switch (e.keyCode) {
        case keyCodes.LEFT:
          ship.direction = null;
          break;
        case keyCodes.RIGHT:
          ship.direction = null;
          break;
      };
    },
    
    keydown: function(e) {
      switch (e.keyCode) {
        case keyCodes.LEFT:
          ship.direction = LEFT;
          ship.move();
          // ship.x -= 10;
          break;
        case keyCodes.RIGHT:
          ship.direction = RIGHT;
          ship.move();
          // ship.x += 10;
          break;
        case keyCodes.SPACE:
          ship.fire();
          break;
        case keyCodes.ESC:
          $.game.paused = !$.game.paused;
          $.game.tick();
          break;
      };
    },
    
    start: function() {
      // check we have canvas
      canvas = document.getElementById('view');      
      if (!canvas || typeof(canvas.getContext) != 'function') {
        return; // and tell them to get a real browser, or use fake canvas for IE
      }
      ctx = canvas.getContext('2d');
      
      // load sprites
      invaders.init();
      littleAlien.init();
      ship.init();

      $(document).keydown(this.keydown);
      $(document).keyup(this.keyup);
      
      // kick off event loop
      this.tick();
    },

    tick: function() {
      if (this.paused) return;
      
      invaders.update();
      ship.update();
      this.detectCollisions();
      // setTimeout(function() { arguments.callee(); }, 100);
      
      setTimeout(function() { $.game.tick(); }, 30);
    },
    
    detectPlayerBulletCollisions: function() {
      if (ship.bullet) { 
        var bx = ship.bullet.x, by = ship.bullet.y; // simplify by treating bullet as a point
        invaders.eachAlien(function() {
          if (this.dead) return;
          if (bx >= this.x1() && bx <= this.x2() && by >= this.y1() && by <= this.y2()) {
            this.dead = true;
            ship.bullet = null;
          }
          // simplistic
        });
      }
      //
    },
    
    detectEnemyBulletCollisions: function () {
      var x1 = ship.x, 
          x2 = ship.x + ship.width,
          y1 = ship.y,
          y2 = ship.y + ship.height;
      $.each(invaders.bullets, function() {
        var bx = this.x, by = this.y;
        if (bx >= x1 && bx <= x2 && by >= y1 && by <= y2) {
          ship.explode();
        }
      });
    },

    detectEnemyShipCollisions: function () {
      var px = ship.x + ship.width / 2, 
          py = ship.y;
      invaders.eachAlien(function() {
        if (this.dead) return;
        if (px >= this.x1() && px <= this.x2() && py >= this.y1() && py <= this.y2()) {
          ship.explode();
        };
      });
    },
    
    detectCollisions: function () {
      this.detectPlayerBulletCollisions();
      this.detectEnemyBulletCollisions();
      this.detectEnemyShipCollisions();
    }
  };
  
  ship = new Sprite({
    src:       './images/ship.png',
    width:     20,
    height:    20,
    x:         null,
    y:         null,
    direction: null,
    speed:     10,
    bullet:    null,
    
    init: function() {
      this.load();
      this.x = canvas.width / 2 - (ship.width / 2);
      this.y = canvas.height - this.height - 20;
    },
    
    update: function() {      
      this.draw(this.x, this.y);
      if (this.bullet) {
        this.bullet.update();
      };
      this.move();
    },
    
    atEdge: function() { return atEdge.call(this); },
    
    move: function() {
      if (this.direction && !this.atEdge()) {
        this.x += this.speed * this.direction;
      }
    },
    
    fire: function() {
      if (this.bullet) { return; };
      this.bullet = new Sprite({ 
        x:   this.x,
        y:   this.y,
        width: 2,
        height: 10,
        speed: 10,
        src: './images/bullet.png',
        update: function() {
          this.y -= this.speed;
          if (this.y < 0) {
            ship.bullet = null;
          }
          this.draw(this.x, this.y);
        }
      });
      this.bullet.load();
    },
    
    explode: function() {
      alert('you die');
      $.game.paused = true;      
    }
  });

  littleAlien = new Sprite({
    src: './images/alien.png',
    width: 20,
    height: 20
  });
    
  invaders = {
    nRows:     2,
    nCols:     12,
    aliens:    [],
    bullets:   [],
    x:         0,
    y:         0,
    xIncr:     5,
    padding:   5,
    width:     null,
    direction: RIGHT,

    atEdge: function() { return atEdge.call(this); },
    
    eachCell: function(otherFunction) {
      for (i = 0; i < this.nRows; i++) {
        for (j = 0; j < this.nCols; j++) {
          otherFunction.call(this, i, j); // function(col, row) { ... }
        };
      };
    },
    
    eachAlien: function(otherFunction) {
      for (row = 0; row < this.nRows; row++) {
        for (col = 0; col < this.nCols; col++) {
          otherFunction.call(this.aliens[row][col]);
        };
      };
    },
    
    draw: function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(this.x, this.y);
      this.eachAlien(function() {
        if (!this.dead) { littleAlien.draw(this.x, this.y); };
      });
      ctx.restore();
    },
    
    move: function() {
      if (this.atEdge()) {
        this.y += littleAlien.height + this.padding;
        this.direction *= -1;
      } else {
        this.x += this.direction * this.xIncr;
      }
    },
    
    update: function() {
      this.move();
      this.draw();
      this.fire();
      for(var i = 0; i < this.bullets.length; i++ ) {
        var bullet = this.bullets[i];
        if (bullet.y > canvas.height) {
          this.bullets.shift();
        } else {
          bullet.y += bullet.speed;
        }
        bullet.draw(bullet.x, bullet.y);
      }  
    },
    
    init: function() {
      for (i = 0; i < this.nRows; i++) {
        var row = [];
        for (j = 0; j < this.nCols; j++) {
          var enemy = new Enemy({
            row: i,
            col: j,
            x: ((littleAlien.width  + this.padding) * j),
            y: ((littleAlien.height + this.padding) * i),
            fleet:  this,
            sprite: littleAlien
          });
          row.push(enemy);
        };
        this.aliens.push(row);
      };
      this.width = (littleAlien.width + this.padding) * this.nCols;
    },
        
    fire: function() {
      if (Math.random() > 0.99) {
        var shooter = this.aliens.random().random();
        if (shooter.dead) { return; }
        
        var bullet = new Sprite({ 
          x:      shooter.x1() + (shooter.sprite.width / 2),
          y:      shooter.y1(),
          width:  2,
          height: 10,
          speed:  5,
          src: './images/bullet.png'
        });
        
        bullet.load();
        this.bullets.push(bullet);
      }
    }
  };
  
  $(document).ready(function() {
    $.game.start();
  });

})(jQuery);