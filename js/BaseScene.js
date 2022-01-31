class BaseScene extends Phaser.Scene {
  /** @type {string} */
  tileDataKey
  /** @type {string} */
  tileDataSource
  player
  /** @type {number} */
  emojiMax = 2
  /** @type {number} */
  emojiCount
  /** @type {number} */
  emojiInterval = 3000
  //@ts-ignore
  matterCollision

  constructor(id) {
    super(id)
    /** @type {string} */
    this.id = id
    /** @type {object} */
    this.emojiSpawnPoint = {}
  }

  preload() {
    this.load.tilemapTiledJSON(this.tileDataKey, this.tileDataSource)
    this.load.image('kenney-tileset', 'assets/tiles/kenney-tileset-64px-extruded.png')
    this.load.spritesheet(
      'player',
      'assets/sprites/0x72-industrial-player-32px-extruded.png', {
      frameWidth: 32,
      frameHeight: 32,
      margin: 1,
      spacing: 2
    }
    )
    this.load.spritesheet("emoji", "assets/sprites/emoji.png", {
      frameWidth: 74,
      frameHeight: 74
    })
  }

  create() {
    this.emojiCount = 0
    const map = this.make.tilemap({ key: this.tileDataKey })
    const tileset = map.addTilesetImage('kenney-tileset')
    map.createLayer('background', tileset, 0, 0)
    const platformLayer = map.createLayer('platforms', tileset, 0, 0)
    map.createLayer('foreground', tileset, 0, 0)
    platformLayer.setCollisionByProperty({ collides: true })
    this.matter.world.convertTilemapLayer(platformLayer)
    const objectLayer = map.getObjectLayer('objectLayer')
    let emojiDeathSensor
    let doorsensor
    objectLayer.objects.forEach(function(object){
      //-- Get Correctly Formatted Objects --//
      let obj = Utils.RetrieveCustomProperties(object)
      //-- Prevents Double Player Bug When Restarting the scene --//
      if(obj.type === 'playerSpawn') {
        if(this.player != null) {
          //@ts-ignore
          this.player.sprite.destroy()
        }
        this.player = new Player(this, obj.x, obj.y)
      } else if (obj.type === 'emojiSpawn') {
        //@ts-ignore
        this.emojiSpawnPoint = {x: obj.x, y:obj.y}
      } else if (obj.type === 'emojiDeathRect') {
        //@ts-ignore
        emojiDeathSensor = this.matter.add.rectangle(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width, obj.height, {
          isStatic: true,
          isSensor: true
        })
      } else if (obj.type === 'exitRect') {
        //@ts-ignore
        doorsensor = this.matter.add.rectangle(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width, obj.height, {
          isStatic: true,
          isSensor: true,
        })
      }
    }, this)
    this.time.addEvent({
      delay: this.emojiInterval,
      callback: this.makeEmoji,
      callbackScope: this,
      loop: true
    })
    this.matterCollision.addOnCollideStart({
      objectA: emojiDeathSensor,
      callback: function(eventData){
        let gameObjectB = eventData.gameObjectB
        if(gameObjectB instanceof Phaser.Physics.Matter.Image && gameObjectB.texture.key === 'emoji') {
          gameObjectB.destroy()
          this.emojiCount--
        }
      },
      context: this
    })
    this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      objectB: doorsensor,
      callback: function(eventData){
        console.log('change scene')
        this.changeScene()
      },
      context: this
    })
    this.matterCollision.addOnCollideStart({
      objectA: this.player.sprite,
      callback: function(eventData){
        let gameObjectB = eventData.gameObjectB
        if(gameObjectB instanceof Phaser.Tilemaps.Tile && gameObjectB.properties.isDeadly) {
          this.player.freeze()
          this.cameras.main.fade(250, 0, 0, 0,)
          this.cameras.main.once('camerafadeoutcomplete', function(){
            this.scene.restart()
          }, this)
        }
      },
      context: this
    })
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player.sprite)
    this.matter.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
  }

  update(time, delta) {
    this.player.update()
  }

  makeEmoji() {
    if(this.emojiCount >= this.emojiMax) {
      return
    }
    const texture = this.textures.get('emoji')
    const frame = Phaser.Math.Between(0, texture.frameTotal - 1)
    let emoji = this.matter.add.image(this.emojiSpawnPoint.x, this.emojiSpawnPoint.y, 'emoji', frame, {
      restitution: 1,
      friction: 0.1,
      density: 0.001,
      //@ts-ignore
      shape: 'circle'
    }).setScale(0.5)
  }

  changeScene() {

  }
}