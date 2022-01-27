import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import * as dat from "dat.gui";
import gsap from "gsap";
import img from "./assets/images/03.jpg";


export default class Sketch {
    constructor(options) {
        this.scene = new THREE.Scene();

        // this.container = options.dom;
        this.container = document.getElementById("container");
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.width, this.height);
        this.renderer.setClearColor(0xeeeeee, 1);
        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;


        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.001,
            1000
        );


        var frustumSize = 1;
        var aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(frustumSize / - 2, frustumSize / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000);
        this.camera.position.set(0, 0, 2);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // this.paused = false;
        this.time = 0;

        this.mouse = {
            x: 0,
            y: 0,
            prevX: 0,
            prevY: 0,
            vX: 0,
            vY: 0
        };

        this.isPlaying = true;
        this.addObjects();
        this.resize();
        //  this.settings();
        this.render();
        this.setupResize();

        this.mouseEvents();
    }

    mouseEvents() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX / this.width;
            this.mouse.y = e.clientY / this.height;

            this.mouse.vX = this.mouse.x - this.mouse.prevX;
            this.mouse.vY = this.mouse.y - this.mouse.prevY;

            this.mouse.prevX = this.mouse.x;
            this.mouse.prevY = this.mouse.y;

        });
    }


    settings() {
        let that = this;
        this.settings = {
            time: 0,
            progress: 0,
        };
        this.gui = new dat.GUI();
    }

    setupResize() {
        window.addEventListener("resize", this.resize.bind(this));
    }

    resize() {
        this.width = this.container.offsetWidth;
        this.height = this.container.offsetHeight;
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;


        // image cover
        // this.imageAspect = 853 / 1280;
        this.imageAspect = 1 / 1.5;
        let a1; let a2;
        if (this.height / this.width > this.imageAspect) {
            a1 = (this.width / this.height) * this.imageAspect;
            a2 = 1;
        } else {
            a1 = 1;
            a2 = (this.height / this.width) / this.imageAspect;
        }

        this.material.uniforms.resolution.value.x = this.width;
        this.material.uniforms.resolution.value.y = this.height;
        this.material.uniforms.resolution.value.z = a1;
        this.material.uniforms.resolution.value.w = a2;


        // optional - cover with quad
        // const dist  = this.camera.position.z;
        // const height = 1;
        // this.camera.fov = 2*(180/Math.PI)*Math.atan(height/(2*dist));

        // // if(w/h>1) {
        // if(this.width/this.height>1){
        //   this.plane.scale.x = this.camera.aspect;
        //   // this.plane.scale.y = this.camera.aspect;
        // } else{
        //   this.plane.scale.y = 1/this.camera.aspect;
        // }

        this.camera.updateProjectionMatrix();
    }

    addObjects() {
        // 512
        this.size = 128;
        const width = this.size;
        const height = this.size;

        const size = width * height;
        // const data = new Uint8Array(4 * size);
        const data = new Float32Array(3 * size);
        const color = new THREE.Color(0xffffff);
        const r = Math.floor(color.r * 255);
        const g = Math.floor(color.g * 255);
        const b = Math.floor(color.b * 255);

        for (let i = 0; i < size; i++) {
            let r = Math.random();
            const stride = i * 3;

            data[stride] = r;
            // data[stride + 1] = g;
            data[stride + 1] = r;
            // data[stride + 2] = b;
            data[stride + 2] = r;

        }

        // used the buffer to create a DataTexture

        this.texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat, THREE.FloatType);
     

    // this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter;
    //    this.texture.needsUpdate = true;

        this.material = new THREE.ShaderMaterial({
            extensions: {
                derivatives: "#extension GL_OES_standard_derivatives : enable"
            },
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0 },
                resolution: { value: new THREE.Vector4() },
                uTexture: { value: new THREE.TextureLoader().load(img) },
                uDataTexture: { value: this.texture }
            },
            // wireframe: true,
            transparent: true,
            vertexShader: vertex,
            fragmentShader: fragment
        });

        this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

        this.plane = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.plane);
    }


    updateDataTexture() {
        let data = this.texture.image.data;
        for (let i = 0; i < data.length; i++) {
            data[i] *= 0.95;
            data[i + 1] *= 0.95;
        }

        let gridMouseX = this.size * this.mouse.x;
        let gridMouseY = this.size * (1 - this.mouse.y);
        let maxDist = this.size / 16;

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                let distance = (gridMouseX - i) ** 2 + (gridMouseY - j) ** 2;
                let matDistSq = maxDist ** 2;
                if (distance < matDistSq) {
                    let index = 3 * (i + this.size * j);
                    let power = Math.sqrt(distance);
                    if (distance < this.size / 32) power = 1;
                    data[index] += 10 * this.mouse.vX * power;
                    data[index + 1] += 10 * this.mouse.vY * power;
                }
            }
        }

        this.mouse.vX *= 0.09;
        this.mouse.vY *= 0.09;


        this.texture.needsUpdate = true;
    }

    stop() {
        this.paused = true;
    }

    play() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.render();
        }
        this.render();
    }

    render() {
        if (this.paused) return;
        this.time += 0.05;
        this.material.uniforms.time.value = this.time;
        requestAnimationFrame(this.render.bind(this));
        this.renderer.render(this.scene, this.camera);
        this.updateDataTexture();
    }
}


new Sketch("container");
