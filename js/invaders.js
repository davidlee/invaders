var SpaceInvaders;

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
  
  // GRAPHICS //-------------------------------------------------------------//
  
  bitmaps = {
    bullet: {
      color: [255,255,0],
      frames: [
        [
          "#",
          "#",
          "#",
          "#"
        ]
      ]
    },
    
    /* TODO bullets
    
        "#  ",
        " # ",
        "  #",
        " # ",
        "#  ",

        " # ",
        " # ",
        " # ",
        "###",
        " # ",


        " # ",
        " # ",
        "## ",
        " ##",
        " # ",
        "## ",
        " ##"
        
        "# # #",
        " ### ",
        "#####",
        " ### ",
        "# # #"
    */
        
    bunker: {
      color: [0,255,0],
      frames: [
        "    #############     ",
        "   ################   ",
        "  ##################  ",
        " #################### ",
        "######################",
        "######################",
        "######################",
        "######################",
        "######################",
        "######################",
        "######################",
        "######################",
        "########      ########",
        "#######        #######",
        "######          ######",
        "######          ######"
      ]
    },

    mothership: {
      color: [0,0,0],
      frames: [
        [
          "     ######     ",
          "   ##########   ",
          "  ############  ",
          " ## ## ## ## ## ",
          "################",
          "  ###  ##  ###  ",
          "   #        #   ",
          "                "
        ]
      ]
    },
    
    c: {
       color: [0,255,255],
       frames: 
       [
         [  
           "     ##     ",
           "    ####    ",
           "   ######   ",
           "  ## ## ##  ",
           "  ########  ",
           "   # ## #   ",
           "  #      #  ",
           "   #    #   ",
           "            "
         ],
         [
           "     ##     ",
           "    ####    ",
           "   ######   ",
           "  ## ## ##  ",
           "  ########  ",
           "    #  #    ",
           "   # ## #   ",
           "  # #  # #  ",
           "            "
         ]
       ]
    },
    
    b: {
      color: [0,255,0],
      frames: 
      [
        [
          "   #     #  ",
          "    #   #   ",
          "   #######  ",
          "  ## ### ## ",
          " ###########",
          " # ####### #",
          " # #     # #",
          "    ## ##   ",
          "            ",
          "            "
       ],
       [
         "   #     #  ",
         " #  #   #  #",
         " # ####### #",
         " ### ### ###",
         " ###########",
         "  ######### ",
         "   #     #  ",
         "  #       # ",
         "            "
        ]                 
      ]
    },

    a: {
      color: [255,0,0],
      frames: 
      [
        [
          "    ####    ",
          " ########## ",
          "############",
          "###  ##  ###",
          "############",
          "  ###  ###  ",
          " ##  ##  ## ",
          "  ##    ##  ",
          "            "
        ],
        [
          "    ####    ",
          " ########## ",
          "############",
          "###  ##  ###",
          "############",
          "   ##  ##   ",
          "  ## ## ##  ",
          "##        ##",
          "            "
        ]
      ]
    },

    ship: {
      color: [0,255,0],
      frames: [
        [
          "      #      ",
          "     ###     ",
          "     ###     ",
          " ########### ",  
          "#############",
          "#############",
          "#############",
          "#############"
         ]      
      ]
    }
  };
  
  function detectRectCollision(ax1,ax2,ay1,ay2, bx1,bx2,by1,by2) {
    return (((ax1 <= bx1 && ax2 >= bx1) || (ax1 <= bx2 && ax2 >= bx2) || 
             (bx1 <= ax1 && bx2 >= ax1) || (bx1 <= ax2 && bx2 >= ax2)) &&
            ((ay1 <= by1 && ay2 >= by1) || (ay1 <= by2 && ay2 >= by2) || 
             (by1 <= ay1 && by2 >= ay1) || (by1 <= ay2 && by2 >= ay2)));
  }
  
  // turns the bitmaps above into a blown-up ImageData object, w/ nice big pixels
  // unfortunately ImageData ignores transformations, or this could be a lot 
  // simpler.
  function makeImage(bitmap, color) {
    r = color[0] || 0;
    g = color[1] || 0;
    b = color[2] || 0;
    var xScale = 2, 
        yScale = 2,
        image = ctx.createImageData(bitmap[0].length * xScale, bitmap.length * yScale),
        px, py;    
    for (var x = 0; x < image.width; x ++) {
      for (var y = 0; y < image.height; y ++) {                
        // Index of the pixel in the array
        px = Math.floor(x / xScale);
        py = Math.floor(y / yScale);
        
        var idx = (x + y * image.width) * 4;

        if (bitmap[py][px] === '#' && (y % 2 === 0)) {  // it's a visible "pixel"
          image.data[idx + 0] = r;
          image.data[idx + 1] = g;
          image.data[idx + 2] = b;
          image.data[idx + 3] = 255; // alpha transparency
        } else {
          image.data[idx + 0] = 0;
          image.data[idx + 1] = 0;
          image.data[idx + 2] = 0;          
          image.data[idx + 3] = 255; // alpha transparency
        };
      };
    };    
    return image;
  }
  
  var Explosion = function(options) {
    var explosion = $.extend({
      x:         null,
      y:         null,
      age:       0,
      alpha:     0,
      k:         0.3,
      size:      20,
      score:     '',
      color:     '#fc0',
      textColor: '#fff',
      
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
        ctx.arc(this.x, this.y, this.alpha * this.size, 0, 180, false);
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
    var sprite = $.extend({
      image:   null,
      
      draw: function (x, y) {
        ctx.putImageData(this.image, x, y);
      }      
    }, options);
    sprite.width  = sprite.image.width;
    sprite.height = sprite.image.height;
    return sprite;
  };

  // Util //-------------------------------------------------------------//

  function atEdge(margin) {
    if (typeof margin === 'undefined') margin = 0;
    if (this.direction === RIGHT) {
      return this.x + margin >= (canvas.width - this.width);
    };
    return this.x <= margin;
  };

  Array.prototype.random = function() { 
    var idx = Math.round(Math.random() * (this.length - 1));
    return this[idx];
  };
    
  // GAME //--------------------------------------------------------------//
  
  SpaceInvaders = {
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
      SpaceInvaders.mouseX = null;
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
          SpaceInvaders.paused = !SpaceInvaders.paused;
          SpaceInvaders.tick();
          break;
      };
    },
    
    mousedown: function(e) {
      ship.fire();
    },

    mousemove: function(e) {
      SpaceInvaders.mouseX = Math.min(e.clientX, canvas.width - ship.width);
    },
    
    start: function() {
      // check we have canvas
      canvas = document.getElementById('view');      
      if (!canvas || typeof(canvas.getContext) !== 'function') {
        return; // and tell them to get a real browser, or use fake canvas for IE
      }
      ctx = canvas.getContext('2d');
            
      // load sprites
      $.each(bitmaps, function(name) {
        var color = bitmaps[name]['color'];
        images[name] = [];
        for (var i=0; i < bitmaps[name]['frames'].length; i++ ) {
          images[name][i] = makeImage(bitmaps[name]['frames'][i], color);
        };
      });
      
      ship = new Player();
      this.mouseX = ship.x;
      this.groundY = ship.y + ship.height;
            
      invaders.init();

      $(document).keydown(this.keydown);
      $(document).keyup(this.keyup);
      $(document).mousedown(this.mousedown);
      $(document).mousemove(this.mousemove);
            
      // kick off event loop
      this.tick();
    },

    // periodically executed function to render scene
    tick: function() {
      if (this.paused || this.lives === 0) return;
      
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
      setTimeout(function() { SpaceInvaders.tick(); }, 30);
    },
    
    renderScore: function() {
      ctx.fillStyle     = '#f00';
      ctx.font          = 'bold 20px monospace';
      ctx.textBaseline  = 'top';      
      ctx.textAlign     = 'left';
      ctx.fillText(this.score, 20, 5);
    },

    renderLives: function() {
      for(var i = 0; i < this.lives; i++ ) {
        ship.draw(canvas.width - (ship.width + 10) * (i + 1), 10);
      };
    },
    
    renderExplosions: function() {
      for (var i = 0; i < explosions.length; i++) {
        explosions[i].update();
      };      
    },

    renderGround: function() {
      ctx.fillStyle = '#000'; // sky
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0'; // ground
      ctx.fillRect(20, this.groundY, canvas.width - 40, 2);
    },
        
    gameOver: function() {
      ctx.fillStyle    = '#f00';
      ctx.font         = 'bold 100px monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'center';
      ctx.fillText("GAME", canvas.width / 2, canvas.height / 2 - 50);
      ctx.fillText("OVER", canvas.width / 2, canvas.height / 2 + 50);
      SpaceInvaders.paused = true;
    },
    
    // collisions simplify by treating bullets as a point
    detectPlayerBulletCollisions: function() {
      var b = ship.bullet, bx1, bx2, by1, by2;
      if (b) { 
        bx1 = b.x;
        bx2 = b.x + b.width;
        by1 = b.y;
        by2 = b.y + b.height;
        invaders.eachAlien(function() {
          if (this.dead) return;
          if (detectRectCollision(bx1, bx2, by1, by2, this.x1(), this.x2(), this.y1(), this.y2())) {
            this.explode(b.x + b.width / 2 , b.y + b.height / 2);
          }
        });
      }
    },
    
    detectEnemyBulletCollisions: function () {
      var x1 = ship.x, 
          x2 = ship.x + ship.width,
          y1 = ship.y,
          y2 = ship.y + ship.height,
          bx1, bx2, by1, by2;
      $.each(invaders.bullets, function() {
        bx1 = this.x;
        bx2 = this.x + this.width;
        by1 = this.y;
        by2 = this.y + this.height;
        if (detectRectCollision(x1, x2, y1, y2, bx1, bx2, by1, by2)) { 
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
        } else if (this.y2() > SpaceInvaders.groundY) {
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
  
  // Player //-----------------------------------------------------------------//

  function Player() {
    var player = new Sprite({
      name:      'Player.',
      image:     images['ship'][0],
      x:         null,
      y:         null,
      direction: null,
      speed:     10,
      bullet:    null,

      xMid:      function() { return this.x + this.width / 2;  },
      yMid:      function() { return this.y + this.height / 2; },    

      update: function() {      
        this.draw(this.x, this.y);
        if (this.bullet) {
          this.bullet.update();
        };
        this.move();
      },

      atEdge: function(margin) { return atEdge.call(this, margin); },

      move: function() {
        if (this.direction && !this.atEdge(this.speed)) {
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
          image: images['bullet'][0],

          update: function() {
            this.y -= this.speed;
            if (this.y < 0) {
              ship.bullet = null;
            } else {
              this.draw(this.x, this.y);              
            }
          }
        });
        document.getElementById('shoot').volume = 0.2;
        document.getElementById('shoot').play();
      },

      explode: function() {
        SpaceInvaders.lives -= 1;
        if (SpaceInvaders.lives > 0) {
          explosions.push(new Explosion({x: ship.xMid(), y: ship.yMid(), size: 50, k: 0.1 }));
          invaders.init();
          ship.init();
        } else {
          SpaceInvaders.gameOver();
        }
      },
      
      init: function() {
        this.x = canvas.width / 2 - (this.width / 2);
        this.y = canvas.height - this.height - 14;
      }
    });
    player.init();
    return player;
  };
  
  // INVADERS //--------------------------------------------------------------//
  
  var Enemy = function(options) {
    return $.extend({
      dead:   false,
      fleet:  invaders,
      points: 10, 
      x1: function() { return this.x + this.fleet.x; },
      x2: function() { return this.x1() + this.fleet.cellWidth; },
      y1: function() { return this.y + this.fleet.y; },
      y2: function() { return this.y1() + this.fleet.cellHeight; },
      explode: function(x,y) {
        this.dead   = true;
        ship.bullet = null;
        SpaceInvaders.score += this.points;
        explosions.push(new Explosion({ x: x, y: y, score: '10' }));
        invaders.remaining -= 1;
        if (invaders.remaining < 8 && invaders.modulus > 1) {
          invaders.modulus--;
        }              
        if (invaders.remaining === 0) {
          invaders.nextWave();
        };
        document.getElementById('kill').volume = 0.2;
        document.getElementById('kill').play();
      }
    }, options);
  };
  
  invaders = {
    nRows:      5,
    nCols:      11,
    aliens:     [],
    bullets:    [],
    x:          0,
    y:          0,
    initX:      0,
    initY:      40,
    padding:    5,
    width:      null,
    remaining:  0,
    direction:   RIGHT,
    speed:          5,
    counter:         0,
    modulus:        20, // only move every n ticks
    initialModulus: 10,  // resets modulus each wave
    frame:      0,

    atEdge: function(margin) { return atEdge.call(this, margin); },
    
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
      this.eachAlien(function() {
        if (!this.dead) {
          var z = ['c','b','b','a','a'][this.row];
          var img = images[z][this.fleet.frame], // TODO fixme
              x = this.x + this.fleet.x,
              y = this.y + this.fleet.y;
          if (this.y2() < SpaceInvaders.groundY) { ctx.putImageData(img, x, y); }
        };
      });
    },
    
    move: function() {
      if (this.counter++ % this.modulus !== 0) {
        return;
      }
      this.frame = (this.frame + 1) % 2; // alternate between 2 frames      
      if (this.atEdge(this.speed)) {
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
        if (bullet.y + bullet.height > SpaceInvaders.groundY) {
          this.bullets.shift();
        } else {
          bullet.y += bullet.speed;
        }
        bullet.draw(bullet.x, bullet.y);
      }  
    },
    
    init: function() {
      this.aliens = [];
      this.bullets = [];
      this.cellWidth  = images['a'][0].width;
      this.cellHeight = images['a'][0].height;
      
      for (i = 0; i < this.nRows; i++) {
        var row = [];
        for (j = 0; j < this.nCols; j++) {
          var enemy = new Enemy({
            row: i,
            col: j,
            x: ((this.cellWidth  + this.padding) * j),
            y: ((this.cellHeight + this.padding) * i),
            fleet:  this
          });
          row.push(enemy);
        };
        this.aliens.push(row);
      };
      
      this.width = (this.cellWidth + this.padding) * this.nCols;
      this.y = this.initY;
      this.x = this.initX;
      this.remaining  = this.nRows * this.nCols;
      this.modulus = this.initialModulus;      
    },
    
    nextWave: function() {
      this.speed          = Math.min(this.speed + 1, 15);
      this.initialModulus = Math.max(this.initialModulus - 1, 5);
      this.init();
    },
        
    fire: function() {
      var shooter, shooters = [];      
      // find the lowest living alien in each column
      // and determine if they should have a chance to shoot
      for(var x = 0; x < this.nCols; x++) {
        for(var y = this.nRows - 1; y >= 0; y--) {
          var alien = this.aliens[y][x];
          if (alien.dead) { 
            continue; 
          } else {
            if (Math.random() > 0.998) {
              shooters.push(alien);
            }
            break;
          };
        };
      };
      
      // choose a shooter randomly, if any
      shooter = shooters.random();
      if (shooter) {
        var bullet = new Sprite({ 
          x:      shooter.x1() + (this.cellWidth / 2),
          y:      shooter.y1(),
          width:  2,
          height: 10,
          speed:  5,
          image:  images['bullet'][0]
        });        
        this.bullets.push(bullet);        
      };
    }
  };
  
  // Boot //-----------------------------------------------------------------//
    
  $(document).ready(function() {
    SpaceInvaders.start();
  });

})(jQuery);
