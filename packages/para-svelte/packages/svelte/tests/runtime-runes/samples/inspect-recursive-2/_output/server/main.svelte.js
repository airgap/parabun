import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			class A {
				constructor() {
					this.a = this;
				}
			}

			const state = new A();

			console.log('$inspect(', state, ')');

			class B {
				constructor() {
					this.a = { b: this };
				}
			}

			const state2 = new B();

			console.log('$inspect(', state2, ')');
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;