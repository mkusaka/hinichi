/**
 * Full-screen quad vertex shader.
 * Used with PlaneGeometry(2, 2) centered at origin.
 */
void main() {
  gl_Position = vec4(position, 1.0);
}
