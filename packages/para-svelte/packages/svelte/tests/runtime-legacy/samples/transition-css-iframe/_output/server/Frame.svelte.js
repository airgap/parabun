import * as $ from 'svelte/internal/server';
import { onMount, onDestroy, tick } from 'svelte';
import { createClassComponent } from 'svelte/legacy';

export default function Frame($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.component(($$renderer) => {
		let component = $$props['component'];
		let frame;
		let doc;
		let content;

		function mountComponent(doc) {
			if (content) content.$destroy();

			if (doc && component) {
				const { component, ...props } = $$sanitized_props;

				// When this test is migrated to runes, use mount/unmount and $state for updating props instead
				content = createClassComponent({ component, target: doc.body, props });
			}
		}

		function updateProps(props) {
			if (content) {
				const { component, ...rest } = props;

				content.$set(rest);
			}
		}

		function loadHandler() {
			doc = frame.contentDocument;

			// import styles
			Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((node) => doc.head.appendChild(node.cloneNode(true)));
		}

		onMount(async () => {
			await tick();

			if (frame.contentDocument.readyState === 'complete' && frame.contentDocument.defaultView) {
				loadHandler();
			} else {
				frame.addEventListener('load', loadHandler);
			}
		});

		onDestroy(() => {
			if (frame) frame.removeEventListener('load', loadHandler);
			if (content) content.$destroy();
		});

		$: mountComponent(doc, component);
		$: updateProps($$sanitized_props);

		$$renderer.push(`<iframe title="frame" class="svelte-4q06av"></iframe>`);
		$.bind_props($$props, { component });
	});
}