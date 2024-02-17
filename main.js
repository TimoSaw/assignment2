import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

let camera, scene, renderer, raycaster, controls;
const cylinders = [];
const mouse = new THREE.Vector2();
let sphere;

const parameters = {
  speed: 0.1, // Initial speed value
  numberOfCylinders: 2,
  cylinderLength: 10,
  sphereRadius: 30 // Initial sphere radius
};

function main() {
  const gui = new GUI();

  // Add a slider to adjust the cylinder velocity
  gui.add(parameters, 'speed', 0.1, 1, 0.1).name('Cylinder Velocity');

  gui.add(parameters, 'numberOfCylinders', 2, 1000, 1).name('Number of Cylinders').onChange((value) => {
    updateNumberOfCylinders(value);
  });

  // Add a slider to adjust the sphere radius
  gui.add(parameters, 'sphereRadius', 10, 100, 1).name('Sphere Radius').onChange((value) => {
    updateSphereRadius(value);
  });

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 75);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('click', onClick);

  const sphereGeometry = new THREE.SphereGeometry(parameters.sphereRadius, 16, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
  sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 0, 0);
  scene.add(sphere);

  for (let i = 0; i < parameters.numberOfCylinders; i++) {
    addCylinder();
  }

  animate();
}

function addCylinder() {
  const randomPoint = getRandomPointOnSphere(sphere);
  const direction = new THREE.Vector3().copy(randomPoint).sub(sphere.position);
  const cylinderGeometry = new THREE.CylinderGeometry(.2, .2, parameters.cylinderLength, 16);
  const cylinderMaterial = new THREE.MeshPhysicalMaterial({ color: 0xff0000 });
  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.position.set(0, 0, 0);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  cylinder.position.add(direction.clone().multiplyScalar(parameters.cylinderLength / 2));
  cylinder.velocity = new THREE.Vector3(0, 0, parameters.speed); // Initial velocity
  scene.add(cylinder);
  cylinders.push(cylinder);
}

function removeCylinder() {
  if (cylinders.length > 0) {
    const cylinder = cylinders.pop();
    scene.remove(cylinder);
  }
}

function updateNumberOfCylinders(num) {
  const currentCylinderCount = cylinders.length;

  if (num > currentCylinderCount) {
    for (let i = 0; i < num - currentCylinderCount; i++) {
      addCylinder();
    }
  } else if (num < currentCylinderCount) {
    for (let i = 0; i < currentCylinderCount - num; i++) {
      removeCylinder();
    }
  }
}

function getRandomPointOnSphere(sphere) {
  const phi = Math.random() * Math.PI * 2;
  const theta = Math.acos(Math.random() * 2 - 1);
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  return new THREE.Vector3(x, y, z).multiplyScalar(sphere.geometry.parameters.radius).add(sphere.position);
}

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(cylinders);

  intersects.forEach(intersection => {
    intersection.object.material.color.setHex(0xff0000);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.update();
}

function updateSphereRadius(radius) {
  parameters.sphereRadius = radius;
  // Update sphere radius
  sphere.geometry.dispose();
  sphere.geometry = new THREE.SphereGeometry(radius, 16, 8);
  sphere.geometry.verticesNeedUpdate = true;
  sphere.geometry.elementsNeedUpdate = true;
  sphere.geometry.computeBoundingSphere();
}


function animate() {
  requestAnimationFrame(animate);

  cylinders.forEach(cylinder => {
    const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(cylinder.quaternion);
    const velocity = direction.clone().multiplyScalar(cylinder.velocity.z * parameters.speed); // Update velocity with the GUI slider
    cylinder.position.add(velocity);

    // Detect intersection with other cylinders
    cylinders.forEach(otherCylinder => {
      if (cylinder !== otherCylinder) {
        const distance = cylinder.position.distanceTo(otherCylinder.position);
        // Adjust the minimum distance for collision detection
        const minDistance = (cylinder.geometry.parameters.height + otherCylinder.geometry.parameters.height) / 4;
        if (distance < minDistance) {
          // Move the cylinders slightly apart to avoid sticking
          const moveDistance = minDistance - distance;
          const moveDirection = cylinder.position.clone().sub(otherCylinder.position).normalize();
          const moveVector = moveDirection.clone().multiplyScalar(moveDistance / 2);
          cylinder.position.add(moveVector);
          otherCylinder.position.sub(moveVector);

          // Adjust direction only if velocities have the same sign (same direction)
          if (cylinder.velocity.z * otherCylinder.velocity.z > 0) {
            // Change direction upon intersection
            cylinder.velocity.z *= -1;
            otherCylinder.velocity.z *= -1;

            // Toggle visibility when intersecting with other cylinders
            cylinder.visible = !cylinder.visible;
          }
        }
      }
    });

    // Detect intersection with the sphere
    const end1 = cylinder.position.clone().add(direction.clone().multiplyScalar(cylinder.geometry.parameters.height / 2));
    const end2 = cylinder.position.clone().add(direction.clone().multiplyScalar(-cylinder.geometry.parameters.height / 2));
    const sphereRadius = sphere.geometry.parameters.radius;
    const distance1 = end1.distanceTo(sphere.position);
    const distance2 = end2.distanceTo(sphere.position);
    if (distance1 > sphereRadius || distance2 > sphereRadius) {
      // Adjust direction only if velocity has the same sign (same direction)
      if (cylinder.velocity.z * parameters.speed > 0) {
        // Change direction upon intersection with the sphere
        cylinder.velocity.z *= -1;
        // Update direction based on the new velocity
        direction.copy(cylinder.velocity).normalize();
      }
    }
  });

  renderer.render(scene, camera);
  controls.update();
}




main();
