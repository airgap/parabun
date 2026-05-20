import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'packages/svelte/tests/server-side-rendering/samples/async-multiple-attrs/main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const user = $.derived(() => Promise.resolve({ name: 'test', image: '' }));

			$.head('1410iyz', $$renderer, ($$renderer) => {
				$$renderer.title(($$renderer) => {
					$$renderer.push(`<title>Async multiple attributes</title>`);
				});
			});

			$$renderer.child(async ($$renderer) => {
				const [$$0, $$1] = (await $.save(Promise.all([
					(async () => (await $.save(user()))().name)(),
					(async () => (await $.save(user()))().image)()
				])))();

				$$renderer.push(`<img${$.attr('alt', $$0)}${$.attr('src', $$1)}/>`);
				$.push_element($$renderer, 'img', 12, 0);
				$.pop_element();
			});
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;