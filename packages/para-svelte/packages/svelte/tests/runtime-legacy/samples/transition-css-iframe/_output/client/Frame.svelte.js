import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount, onDestroy, tick } from 'svelte';
import { createClassComponent } from 'svelte/legacy';

var root = $.from_html(`<iframe title="frame" class="svelte-4q06av"></iframe>`);

export default function Frame($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);

	let component = $.prop($$props, 'component', 12);
	let frame = $.mutable_source();
	let doc = $.mutable_source();
	let content;

	function mountComponent(doc) {
		if (content) content.$destroy();

		if (doc && component()) {
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
		$.set(doc, $.get(frame).contentDocument);

		// import styles
		Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((node) => $.get(doc).head.appendChild(node.cloneNode(true)));
	}

	onMount(async () => {
		await tick();

		if ($.get(frame).contentDocument.readyState === 'complete' && $.get(frame).contentDocument.defaultView) {
			loadHandler();
		} else {
			$.get(frame).addEventListener('load', loadHandler);
		}
	});

	onDestroy(() => {
		if ($.get(frame)) $.get(frame).removeEventListener('load', loadHandler);
		if (content) content.$destroy();
	});

	$.legacy_pre_effect(() => ($.get(doc), $.deep_read_state(component())), () => {
		mountComponent($.get(doc), component());
	});

	$.legacy_pre_effect(() => ($.deep_read_state($$sanitized_props)), () => {
		updateProps($$sanitized_props);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get component() {
			return component();
		},

		set component($$value) {
			component($$value);
			$.flush();
		}
	};

	$.init();

	var iframe = root();

	$.bind_this(iframe, ($$value) => $.set(frame, $$value), () => $.get(frame));
	$.append($$anchor, iframe);

	return $.pop($$exports);
}