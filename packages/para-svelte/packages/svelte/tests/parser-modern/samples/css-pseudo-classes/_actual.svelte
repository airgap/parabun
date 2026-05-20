

<style>
	::view-transition-old {
		color: red;
	}

	:global(::view-transition-old) {
		color: red;
	}

	::highlight {
		color: red;
	}

	custom-element::part {
		color: red;
	}

	::slotted {
		color: red;
	}

	:is(button, h1 + p) {
		color: red;
	}
</style>