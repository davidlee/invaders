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
      invaders, ship, alien, 
      bitmaps, images = {},
      explosions = [];
  
  bitmaps = {
    bullet: [
      "##",
      "##",
      "##",
      "##",
      "##",
      "##",
      "##",
      "##",
      "##",
      "##"
    ],
    
    a1: [
      "   ###   ",
      "  #####  ",
      " ####### ",
      "#########",
      "# ##### #",
      "#########",
      "   # #   ",
      "  # # #  ",
      " # # # # ",
      "#       #"
    ],
    
    a2: [
      "   ###   ",
      "  #####  ",
      " ####### ",
      "#########",
      "# ##### #",
      "#########",
      "   # #   ",
      "# # # # #",
      " #     # ",
      "         "
    ],
    
    ship: [
      "         ",
      "         ",
      "    #    ",
      "  #####  ",
      " ####### ",
      "#########",
      "#########",
      "#########",
      "#########",
      "#########"
    ],
    
  };
  
  // turns the bitmaps above into a blown-up ImageData object, w/ nice big pixels
  // unfortunately ImageData ignores transformations, or this could be a lot 
  // simpler.
  function makeImage(bitmap, r, g, b) {
    var xScale = 3, 
        yScale = 3,
        image = ctx.createImageData(bitmap[0].length * xScale, bitmap.length * yScale),
        px, py;    
    for (var x = 0; x < image.width; x ++) {
      for (var y = 0; y < image.height; y ++) {                
        // Index of the pixel in the array
        px = Math.floor(x / xScale);
        py = Math.floor(y / yScale);
        
        if (bitmap[py][px] == '#') {  // it's a visible "pixel"
          var idx = (x + y * image.width) * 4;
          image.data[idx + 0] = r || 0;
          image.data[idx + 1] = g || 0;
          image.data[idx + 2] = b || 0;
          image.data[idx + 3] = 255;
        };
      };
    };    
    return image;
  }

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

  var Explosion = function(options) {
    var explosion = $.extend({
      x:         null,
      y:         null,
      age:       0,
      alpha:     0,
      k:         0.3,
      size:      20,
      score:     '',
      color:     '#f70',
      textColor: '#f00',
      
      update: function() {
        // the alpha (and explosion size) follow a sine curve of growth
        // and subsequent contraction
        this.age += this.k;
        this.alpha = Math.sin(this.age); 
        if (this.alpha < 0) {
          explosions.shift();
        } else {          
          this.draw();
        };
      },
      
      draw: function() {        
        ctx.save();
        ctx.beginPath();        
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle   = this.color;        
        ctx.arc(this.x, this.y, this.alpha * this.size, 0, 180);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle    = this.textColor;
        ctx.font         = 'bold ' + this.age * 10 + 'px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign    = 'center';
        ctx.fillText(this.score, this.x, this.y - this.age * 10);        
        ctx.restore();
      }
    }, options);
    return explosion;
  };
  
  var Sprite = function(options) {
    return $.extend({
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
      dead:   false,
      fleet:  invaders,
      points: 10, 
      x1: function() { return this.x + this.fleet.x; },
      x2: function() { return this.x1() + this.fleet.cellWidth; },
      y1: function() { return this.y + this.fleet.y; },
      y2: function() { return this.y1() + this.fleet.cellHeight; }
    }, options);
  };
  
  // GAME //--------------------------------------------------------------//
  
  $.game = {
    paused: false,
    score: 0,
    lives: 3,
    groundY: null,
    mouseX:  null,
    
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
      $.game.mouseX = null;
      switch (e.keyCode) {
        case keyCodes.LEFT:
          ship.direction = LEFT;
          ship.move();
          break;
        case keyCodes.RIGHT:
          ship.direction = RIGHT;
          ship.move();
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
    
    mousedown: function(e) {
      ship.fire();
    },

    mousemove: function(e) {
      $.game.mouseX = Math.min(e.clientX, canvas.width - ship.width);
    },
    
    start: function() {
      // check we have canvas
      canvas = document.getElementById('view');      
      if (!canvas || typeof(canvas.getContext) != 'function') {
        return; // and tell them to get a real browser, or use fake canvas for IE
      }
      ctx = canvas.getContext('2d');
      
      this.mouseX = ship.x;
      
      // load sprites
      $.each(bitmaps, function(name) {
        images[name] = makeImage(bitmaps[name]);
      });
      
      invaders.init();
      ship.init();
      
      this.groundY = ship.y + ship.height;

      $(document).keydown(this.keydown);
      $(document).keyup(this.keyup);
      $(document).mousedown(this.mousedown);
      $(document).mousemove(this.mousemove);
            
      // kick off event loop
      this.tick();
    },

    // periodically executed function to render scene
    tick: function() {
      if (this.paused || this.lives == 0) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.renderGround();
      invaders.update();
      ship.update();
      this.detectCollisions();
      this.renderScore();
      this.renderLives();
      this.renderExplosions();
                  
      // move the ship with the mouse
      if (this.mouseX) {
        if (Math.abs(ship.xMid() - this.mouseX) < ship.speed) {
          ship.x = this.mouseX;
        }
        if (ship.xMid() > this.mouseX) {
          ship.direction = LEFT;
        } else if (ship.xMid() < this.mouseX) {
          ship.direction = RIGHT;
        } else {
          ship.direction = null;
        }
      }
      
      // rinse, repeat
      setTimeout(function() { $.game.tick(); }, 30);
    },
    
    renderScore: function() {
      ctx.fillStyle     = '#f00';
      ctx.font          = 'bold 20px monospace';
      ctx.textBaseline  = 'top';      
      ctx.textAlign     = 'right';
      ctx.fillText(this.score, 50, 5);
    },

    renderLives: function() {
      for(var i = 0; i < this.lives; i++ ) {
        ship.draw(500 + 30 * i, 10);
      };
    },
    
    renderExplosions: function() {
      for (var i = 0; i < explosions.length; i++) {
        explosions[i].update();
      };      
    },

    renderGround: function() {
      ctx.fillStyle = '#eff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#9c5';
      ctx.fillRect(0, this.groundY, canvas.width, canvas.height);
    },
        
    gameOver: function() {
      ctx.fillStyle    = '#f00';
      ctx.font         = 'bold 100px monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText("GAME", canvas.width / 2, canvas.height / 2 - 50);      
      ctx.fillText("OVER", canvas.width / 2, canvas.height / 2 + 50);
      $.game.paused = true;
    },
    
    // collisions simplify by treating bullets as a point
    detectPlayerBulletCollisions: function() {
      if (ship.bullet) { 
        var bx = ship.bullet.x, by = ship.bullet.y;
        invaders.eachAlien(function() {
          if (this.dead) return;
          if (bx >= this.x1() && bx <= this.x2() && by >= this.y1() && by <= this.y2()) {
            this.dead   = true;
            ship.bullet = null;
            $.game.score += this.points;
            explosions.push(new Explosion({x: bx, y: by, score: '10'}));
            invaders.remaining -= 1;
            if (invaders.remaining == 0) {
              invaders.nextWave();
            };
            return;
          }
        });
      }
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
      var px = ship.xMid(), 
          py = ship.yMid();
      invaders.eachAlien(function() {
        if (this.dead) return;
        if (px >= this.x1() && px <= this.x2() && py >= this.y1() && py <= this.y2()) {
          ship.explode();
        } else if (this.y2() > $.game.groundY) {
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
  
  // SHIP //-----------------------------------------------------------------//

  ship = new Sprite({
    src:       './images/ship.png',
    width:     20,
    height:    20,
    x:         null,
    y:         null,
    direction: null,
    speed:     10,
    bullet:    null,

    xMid:      function() { return this.x + this.width / 2;  },
    yMid:      function() { return this.y + this.height / 2; },    
    
    init: function() {
      this.load();
      this.x = canvas.width / 2 - (ship.width / 2);
      this.y = canvas.height - this.height - 14;
      this.mousePos = canvas.width / 2;
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
        width:  2,
        height: 10,
        speed:  15,
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
      $.game.lives -= 1;
      if ($.game.lives > 0) {
        invaders.reset();
        ship.init();
        explosions.push(new Explosion({x: ship.xMid(), y: ship.yMid() }));
      } else {
        $.game.gameOver();
      }
    }
  });
  
  // INVADERS //--------------------------------------------------------------//
  
  invaders = {
    nRows:      5,
    nCols:      11,
    aliens:     [],
    bullets:    [],
    x:          0,
    y:          0,
    initX:      0,
    initY:      40,    
    speed:      10,
    padding:    5,
    width:      null,
    remaining:  0,
    direction:  RIGHT,
    counter:    0,
    modulus:    10, // only move every n ticks
    frame:      1,

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
      // ctx.save();
      // ctx.translate(this.x, this.y);
      // ctx.scale(200, 200);
      this.eachAlien(function() {
        if (!this.dead) {
          ctx.putImageData(images['a' + this.fleet.frame], this.x + this.fleet.x, this.y + this.fleet.y);
          // this.sprite.draw(this.x, this.y);
        };
      });
      // ctx.restore();
    },
    
    move: function() {
      if (this.counter++ % this.modulus != 0) {
        return;
      }
      this.frame = (this.frame) % 2 + 1; // alternate between 2 frames
      if (this.atEdge()) {
        this.y += this.cellHeight + this.padding;
        this.direction *= -1;
      } else {
        this.x += this.direction * this.speed;
      }
    },
    
    update: function() {
      this.move();
      this.draw();
      this.fire();
      for(var i = 0; i < this.bullets.length; i++ ) {
        var bullet = this.bullets[i];
        if (bullet.y + bullet.height > $.game.groundY) {
          this.bullets.shift();
        } else {
          bullet.y += bullet.speed;
        }
        bullet.draw(bullet.x, bullet.y);
      }  
    },
    
    init: function() {
      this.aliens = [];
      this.cellWidth  = images['a1'].width;
      this.cellHeight = images['a1'].height;
      
      for (i = 0; i < this.nRows; i++) {
        var row = [];
        for (j = 0; j < this.nCols; j++) {
          var enemy = new Enemy({
            row: i,
            col: j,
            x: ((this.cellWidth  + this.padding) * j),
            y: ((this.cellHeight + this.padding) * i),
            fleet:  this,
          });
          row.push(enemy);
        };
        this.aliens.push(row);
      };
      this.width = (this.cellWidth + this.padding) * this.nCols;
      this.y = this.initY;
      this.x = this.initX;
      this.remaining  = this.nRows * this.nCols;
    },
    
    reset: function() {
      this.bullets = [];
      this.y = this.initY;
      this.x = 0;
    },
    
    nextWave: function() {
      this.speed = Math.min(this.speed + 1, 15);
      this.init();
    },
        
    fire: function() {
      if (Math.random() > 0.95) {
        var shooter = this.aliens.random().random();
        if (shooter.dead) { return; }
        
        var bullet = new Sprite({ 
          x:      shooter.x1() + (this.cellWidth / 2),
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

  $.ship = ship;

})(jQuery);