import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';

let camera, scene, renderer, raycaster, controls;

const spheres = [];
const cylinders = [];
const mouse = new THREE.Vector2();

var gui;


// Define the parameters object
const parameters = {
  cylinderLength: 10 // Initial length of the cylinder
};





function main() {


//GUI
gui = new GUI;

gui.add(parameters, 'cylinderLength', 1, 50, 1).onChange((value) => {
  cylinders.forEach(cylinder => {
      const directionToSphere = new THREE.Vector3().copy(spheres[0].position).sub(cylinder.position).normalize();
      const heightChange = value - cylinder.geometry.parameters.height;
      const newHeight = Math.max(0, heightChange * directionToSphere.dot(cylinder.up));

      const currentPosition = cylinder.position.clone();
      const newPosition = currentPosition.clone().add(directionToSphere.clone().multiplyScalar(newHeight));

      cylinder.geometry.dispose();
      cylinder.geometry = new THREE.CylinderGeometry(1, 1, value, 16);
      cylinder.position.copy(newPosition);
  });
});



  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 75);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Add directional light
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





  // Create sphere
  const sphereGeometry = new THREE.SphereGeometry(30, 16, 8);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(0, 0, 0);
  scene.add(sphere);
  spheres.push(sphere);

  // Generate random point on the surface of the sphere
  const randomPoint = getRandomPointOnSphere(sphere);

  // Calculate direction and length for the cylinder
  const direction = new THREE.Vector3().copy(randomPoint).sub(sphere.position);
  const length = direction.length();

  // Create cylinder starting at the center of the sphere and ending at the random point on the sphere's surface
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, parameters.cylinderLength, 16);
  const cylinderMaterial = new THREE.MeshPhysicalMaterial({ color: 0xff0000 });
  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.position.set(0, 0, 0);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  cylinder.position.add(direction.clone().multiplyScalar(parameters.cylinderLength / 2));

  // Add a velocity property to the cylinder
  cylinder.velocity = new THREE.Vector3(0, 0, 0.1); // Adjust the values as needed



  scene.add(cylinder);
  cylinders.push(cylinder);

 
  animate();
}
main();



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

  const intersects = raycaster.intersectObjects(spheres);

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

function animate() {
  requestAnimationFrame(animate);

  cylinders.forEach(cylinder => {
      // Get the direction of the cylinder
      const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(cylinder.quaternion);

      // Multiply the direction by the velocity scalar
      const velocity = direction.clone().multiplyScalar(cylinder.velocity.z);

      // Move the cylinder along its direction
      cylinder.position.add(velocity);

      // Compute the positions of both ends of the cylinder
      const end1 = cylinder.position.clone().add(direction.clone().multiplyScalar(cylinder.geometry.parameters.height / 2));
      const end2 = cylinder.position.clone().add(direction.clone().multiplyScalar(-cylinder.geometry.parameters.height / 2));

      // Compute the distances from the ends of the cylinder to the sphere center
      const sphereRadius = spheres[0].geometry.parameters.radius;
      const distance1 = end1.distanceTo(spheres[0].position);
      const distance2 = end2.distanceTo(spheres[0].position);

      // Check if any part of the cylinder is outside the sphere
      if (distance1 > sphereRadius || distance2 > sphereRadius) {
          cylinder.velocity.z *= -1; // Reverse the direction
      }
  });

  renderer.render(scene, camera);
  controls.update();
}


